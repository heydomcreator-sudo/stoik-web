// ============================================================================
//  api/generate/image.js — vygeneruje obrázek pro JEDEN slide
//  POST /api/generate/image
//    body: { generation_id, slide_index, image_prompt, visual_identity }
//  Chráněno requireAuth.
// ============================================================================
//
//  Zavolá fal.ai pro jeden slide, uloží image_url do generations.slides[index]
//  a vrátí { image_url }. Používá se při přidání nového slidu v editoru.

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { generateImage } from '../_lib/generate.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const generationId = req.body?.generation_id
    const slideIndex = req.body?.slide_index
    const imagePrompt = req.body?.image_prompt
    const visualIdentity = req.body?.visual_identity || ''

    if (!generationId || !Number.isInteger(slideIndex)) {
      return res
        .status(400)
        .json({ error: 'generation_id a slide_index (integer) jsou povinné' })
    }
    if (!imagePrompt) {
      return res.status(400).json({ error: 'image_prompt je povinný' })
    }
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'Chybí FAL_KEY' })
    }

    const db = supabaseAdmin()
    const { data: gen, error } = await db
      .from('generations')
      .select('slides')
      .eq('id', generationId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!gen) return res.status(404).json({ error: 'Generace nenalezena' })

    const slides = Array.isArray(gen.slides) ? gen.slides : []
    if (slideIndex < 0 || slideIndex >= slides.length) {
      return res.status(400).json({ error: 'slide_index mimo rozsah' })
    }

    try {
      const imageUrl = await generateImage(imagePrompt, visualIdentity)
      slides[slideIndex] = { ...slides[slideIndex], image_url: imageUrl }

      const { error: upErr } = await db
        .from('generations')
        .update({ slides })
        .eq('id', generationId)
      if (upErr) return res.status(500).json({ error: upErr.message })

      return res.status(200).json({ image_url: imageUrl })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Generování obrázku selhalo' })
    }
  })
}
