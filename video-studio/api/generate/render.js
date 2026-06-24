// ============================================================================
//  api/generate/render.js — vyrenderuje finální MP4 ke generaci a uloží ho
//  POST /api/generate/render   body: { generation_id }
//  Chráněno requireAuth.
// ============================================================================
//
//  Použije uložené slide.audio_url (reuse), jinak nadabuje hlasem projektu.
//  Výsledné video uloží do Storage a zapíše generations.video_url, aby ho cron
//  při publikaci jen použil (neplatí render/dabing znovu).

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { renderAndUploadSlideshow } from '../_lib/videoRender.js'

export const config = { maxDuration: 300 }

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const generationId = req.body?.generation_id
    if (!generationId) {
      return res.status(400).json({ error: 'generation_id je povinný' })
    }

    const db = supabaseAdmin()
    const { data: gen, error } = await db
      .from('generations')
      .select('project_id, slides')
      .eq('id', generationId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!gen) return res.status(404).json({ error: 'Generace nenalezena' })

    const slides = Array.isArray(gen.slides) ? gen.slides : []
    if (slides.length === 0) {
      return res.status(400).json({ error: 'Generace nemá slidy' })
    }

    // '*' je odolné vůči chybějícímu sloupci (např. hook_* bez migrace schématu).
    const { data: project } = await db
      .from('projects')
      .select('*')
      .eq('id', gen.project_id)
      .maybeSingle()

    try {
      const videoUrl = await renderAndUploadSlideshow(
        slides,
        `${gen.project_id}/${generationId}.mp4`,
        project?.elevenlabs_voice_id || null,
        project?.caption_style || null,
        {
          enabled: !!project?.hook_enabled,
          position: project?.hook_position || 'start',
          imageUrl: project?.hook_image_url || null,
        },
      )
      await db
        .from('generations')
        .update({ video_url: videoUrl })
        .eq('id', generationId)
      return res.status(200).json({ video_url: videoUrl })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Render videa selhal' })
    }
  })
}
