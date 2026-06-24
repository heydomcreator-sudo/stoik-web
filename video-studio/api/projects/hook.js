// ============================================================================
//  api/projects/hook.js — vizuální hook projektu: generování (fal.ai) / smazání
//  POST /api/projects/hook   body: { project_id, action: 'generate' | 'delete' }
//  Chráněno requireAuth.
// ============================================================================
//
//  action='generate': z hook_image_prompt vygeneruje obrázek (fal.ai flux/schnell,
//    1080×1080), uloží ho do Storage bucketu "hooks" jako {project_id}/hook.jpg
//    a public URL zapíše do projects.hook_image_url.
//  action='delete':   smaže soubor ze Storage a nastaví hook_image_url = null.

import { fal } from '@fal-ai/client'
import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

export const config = { maxDuration: 60 }

const HOOK_KEY = (projectId) => `${projectId}/hook.jpg`

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const projectId = req.body?.project_id
    const action = req.body?.action
    if (!projectId) {
      return res.status(400).json({ error: 'project_id je povinný' })
    }
    if (action !== 'generate' && action !== 'delete') {
      return res.status(400).json({ error: "action musí být 'generate' nebo 'delete'" })
    }

    const db = supabaseAdmin()

    // ── delete ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { error: rmErr } = await db.storage.from('hooks').remove([HOOK_KEY(projectId)])
      // Chybějící soubor není fatální — pokračujeme a vynulujeme URL.
      if (rmErr && !/not.*found/i.test(rmErr.message || '')) {
        return res.status(500).json({ error: rmErr.message })
      }
      const { error: upErr } = await db
        .from('projects')
        .update({ hook_image_url: null })
        .eq('id', projectId)
      if (upErr) return res.status(500).json({ error: upErr.message })
      return res.status(200).json({ hook_image_url: null })
    }

    // ── generate ────────────────────────────────────────────────────────────
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'Chybí FAL_KEY' })
    }

    const { data: project, error } = await db
      .from('projects')
      .select('hook_image_prompt')
      .eq('id', projectId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!project) return res.status(404).json({ error: 'Projekt nenalezen' })

    const prompt = (project.hook_image_prompt || '').trim()
    if (!prompt) {
      return res.status(400).json({ error: 'Projekt nemá hook_image_prompt' })
    }

    try {
      // 1) fal.ai → čtvercový obrázek hooku
      fal.config({ credentials: process.env.FAL_KEY })
      const result = await fal.subscribe('fal-ai/flux/schnell', {
        input: { prompt, image_size: { width: 1080, height: 1080 } },
      })
      const falUrl = result?.data?.images?.[0]?.url
      if (!falUrl) throw new Error('fal.ai nevrátilo obrázek')

      // 2) stáhni obrázek z fal.ai
      const imgRes = await fetch(falUrl)
      if (!imgRes.ok) throw new Error(`Stažení obrázku selhalo (${imgRes.status})`)
      const buffer = Buffer.from(await imgRes.arrayBuffer())

      // 3) ulož do Storage bucketu "hooks" jako {project_id}/hook.jpg
      const { error: stErr } = await db.storage
        .from('hooks')
        .upload(HOOK_KEY(projectId), buffer, { contentType: 'image/jpeg', upsert: true })
      if (stErr) throw new Error(`Storage upload: ${stErr.message}`)

      const { data: pub } = db.storage.from('hooks').getPublicUrl(HOOK_KEY(projectId))
      if (!pub?.publicUrl) throw new Error('Storage: chybí public URL')
      // Cache-busting: stejný klíč se přepisuje, ať náhled ukáže nový obrázek.
      const hookImageUrl = `${pub.publicUrl}?v=${Date.now()}`

      // 4) zapiš URL do projektu
      const { error: upErr } = await db
        .from('projects')
        .update({ hook_image_url: hookImageUrl })
        .eq('id', projectId)
      if (upErr) throw new Error(upErr.message)

      return res.status(200).json({ hook_image_url: hookImageUrl })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Generování hooku selhalo' })
    }
  })
}
