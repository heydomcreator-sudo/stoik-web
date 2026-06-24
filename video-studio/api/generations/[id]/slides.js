// ============================================================================
//  api/generations/[id]/slides.js — úprava slidů generace
//  PUT /api/generations/:id/slides   body: { slides: [...] }
//  Chráněno requireAuth.
// ============================================================================
//
//  Přepíše slides (JSONB) dané generace — používá edit modal v UI (úprava
//  titulku/textu slidu, přidání slidu).

import { requireAuth } from '../../_lib/auth.js'
import { supabaseAdmin } from '../../_lib/supabase.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const { id } = req.query
    const slides = req.body?.slides
    if (!Array.isArray(slides)) {
      return res.status(400).json({ error: 'slides musí být pole' })
    }

    const db = supabaseAdmin()
    // Hlavní zápis slidů — musí projít (i bez migrace 011).
    const { data, error } = await db
      .from('generations')
      .update({ slides })
      .eq('id', id)
      .select('id, slides')
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Generace nenalezena' })

    // Best-effort invalidace dříve vyrenderovaného videa (sloupec video_url
    // nemusí existovat, dokud neproběhne migrace 011 → chybu ignorujeme).
    await db.from('generations').update({ video_url: null }).eq('id', id)

    return res.status(200).json(data)
  })
}
