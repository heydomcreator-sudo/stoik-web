// ============================================================================
//  api/generate/status.js — stav generování (frontend pollinguje každé 3 s)
//  GET /api/generate/status?generation_id=…  → { status, topic, slides, error_text }
//  Chráněno requireAuth.
// ============================================================================

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const generationId = req.query.generation_id
    if (!generationId) {
      return res.status(400).json({ error: 'generation_id je povinný' })
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('generations')
      // '*' je odolné vůči chybějícímu sloupci (např. nenasazená migrace 011
      // s video_url) — endpoint pak neselže a náhled se otevře.
      .select('*')
      .eq('id', generationId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Generace nenalezena' })

    return res.status(200).json(data)
  })
}
