// ============================================================================
//  api/generate/speech.js — TTS audio jednoho slidu pro náhled v dashboardu
//  POST /api/generate/speech   body: { text, voice_id }  → audio/mpeg
//  Chráněno requireAuth.
// ============================================================================
//
//  Používá přehrávač náhledu: přehraje hlas projektu nad slidy bez nutnosti
//  renderovat celé MP4. Pozn.: každé volání spotřebuje kredity ElevenLabs.

import { requireAuth } from '../_lib/auth.js'
import { generateSpeech } from '../_lib/elevenlabs.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const text = req.body?.text
    const voiceId = req.body?.voice_id
    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text a voice_id jsou povinné' })
    }

    try {
      const buf = await generateSpeech(text, voiceId)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.status(200)
      return res.end(buf)
    } catch (e) {
      return res.status(502).json({ error: e.message || 'TTS selhalo' })
    }
  })
}
