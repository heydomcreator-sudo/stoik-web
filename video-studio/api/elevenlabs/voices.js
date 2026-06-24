// ============================================================================
//  api/elevenlabs/voices.js — seznam hlasů ElevenLabs pro výběr v dashboardu
//  GET /api/elevenlabs/voices  → [{ voice_id, name, preview_url }]
//  Chráněno requireAuth.
// ============================================================================

import { requireAuth } from '../_lib/auth.js'
import { listVoices } from '../_lib/elevenlabs.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }
    try {
      const voices = await listVoices()
      return res.status(200).json(voices)
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Načtení hlasů selhalo' })
    }
  })
}
