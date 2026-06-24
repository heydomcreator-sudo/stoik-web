// ============================================================================
//  api/queue/remove.js — vyřazení generace z fronty (bez mazání)
//  DELETE /api/queue/remove?id=…
//  Chráněno requireAuth.
// ============================================================================
//
//  Nastaví queue_status = 'skipped' — řádek zůstává, jen vypadne z fronty.

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'id je povinné' })

    const db = supabaseAdmin()
    const { error } = await db
      .from('generations')
      .update({ queue_status: 'skipped' })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(204).end()
  })
}
