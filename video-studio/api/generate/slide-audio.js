// ============================================================================
//  api/generate/slide-audio.js — vygeneruje a uloží audio JEDNOHO slidu
//  POST /api/generate/slide-audio
//    body: { generation_id, slide_index, text, voice_id }
//  Chráněno requireAuth.
// ============================================================================
//
//  Nadabuje text hlasem projektu, nahraje MP3 do Storage (bucket "videos",
//  složka audio/) a vrátí { audio_url }. Frontend ho pak přes „Uložit hlas"
//  zapíše do slides[index].audio_url (PUT /api/generations/:id/slides).

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { generateSpeech } from '../_lib/elevenlabs.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const generationId = req.body?.generation_id
    const slideIndex = req.body?.slide_index
    const text = req.body?.text
    const voiceId = req.body?.voice_id

    if (!generationId || !Number.isInteger(slideIndex)) {
      return res
        .status(400)
        .json({ error: 'generation_id a slide_index (integer) jsou povinné' })
    }
    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text a voice_id jsou povinné' })
    }

    try {
      const buf = await generateSpeech(text, voiceId)
      const key = `audio/${generationId}/${slideIndex}.mp3`

      const db = supabaseAdmin()
      const { error } = await db.storage
        .from('videos')
        .upload(key, buf, { contentType: 'audio/mpeg', upsert: true })
      if (error) throw new Error(`Storage upload: ${error.message}`)

      const { data } = db.storage.from('videos').getPublicUrl(key)
      if (!data?.publicUrl) throw new Error('Storage: chybí public URL')

      // Cache-busting: po přegenerování se mění obsah na stejném klíči.
      const audioUrl = `${data.publicUrl}?t=${Date.now()}`
      return res.status(200).json({ audio_url: audioUrl })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Generování audia selhalo' })
    }
  })
}
