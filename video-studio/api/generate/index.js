// ============================================================================
//  api/generate/index.js
//    POST /api/generate            body: { project_id }  → spustí generování
//    GET  /api/generate?project_id=…                     → historie (5 generací)
//  Chráněno requireAuth.
// ============================================================================
//
//  POST vrátí { generation_id } IHNED (HTTP 202) a zbytek dožene na pozadí
//  přes waitUntil() — funkce zůstane živá až do dokončení generateCarousel
//  (v rámci maxDuration nastaveného ve vercel.json).

import { waitUntil } from '@vercel/functions'
import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { generateCarousel } from '../_lib/generate.js'

// Další volná pozice ve frontě projektu (max queue_position + 1).
async function nextQueuePosition(db, projectId) {
  const { data } = await db
    .from('generations')
    .select('queue_position')
    .eq('project_id', projectId)
    .order('queue_position', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  return (data?.queue_position || 0) + 1
}

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    const db = supabaseAdmin()

    // ── Historie generací projektu ───────────────────────────────────────────
    if (req.method === 'GET') {
      const projectId = req.query.project_id
      if (!projectId) return res.status(400).json({ error: 'project_id je povinný' })
      const { data, error } = await db
        .from('generations')
        .select('id, status, topic, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    // ── Spuštění nového generování ───────────────────────────────────────────
    if (req.method === 'POST') {
      const projectId = req.body?.project_id
      if (!projectId) return res.status(400).json({ error: 'project_id je povinný' })

      if (!process.env.ANTHROPIC_API_KEY || !process.env.FAL_KEY) {
        return res
          .status(500)
          .json({ error: 'Server není nakonfigurován (ANTHROPIC_API_KEY / FAL_KEY)' })
      }

      const { data: project, error: pErr } = await db
        .from('projects')
        .select('id, brand_voice')
        .eq('id', projectId)
        .maybeSingle()
      if (pErr) return res.status(500).json({ error: pErr.message })
      if (!project) return res.status(404).json({ error: 'Projekt nenalezen' })

      const { data: gen, error } = await db
        .from('generations')
        .insert({
          project_id: projectId,
          status: 'pending',
          brand_voice_snapshot: project.brand_voice || '',
          // Nová generace na konec fronty (queue_position = max + 1).
          queue_position: await nextQueuePosition(db, projectId),
          queue_status: 'queued',
        })
        .select('id')
        .single()
      if (error) return res.status(500).json({ error: error.message })

      // Asynchronní zpracování — odpovíme hned, generování doběhne na pozadí.
      waitUntil(generateCarousel(gen.id))

      return res.status(202).json({ generation_id: gen.id })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  })
}
