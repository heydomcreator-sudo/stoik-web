// ============================================================================
//  api/queue/reorder.js — změna pořadí ve frontě
//  PUT /api/queue/reorder   body: { project_id, ordered_ids: [id1, id2, …] }
//  Chráněno requireAuth.
// ============================================================================
//
//  Nastaví queue_position podle pořadí v poli (první = 1, druhý = 2, …).
//  Aktualizují se jen generace daného projektu (ownership přes project_id).

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const projectId = req.body?.project_id
    const orderedIds = req.body?.ordered_ids
    if (!projectId) return res.status(400).json({ error: 'project_id je povinný' })
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'ordered_ids musí být pole' })
    }

    const db = supabaseAdmin()
    // Postupně nastavíme queue_position; eq na project_id chrání proti zápisu
    // do cizího projektu (i kdyby v poli proklouzlo cizí id).
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db
        .from('generations')
        .update({ queue_position: i + 1 })
        .eq('id', orderedIds[i])
        .eq('project_id', projectId)
      if (error) return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ ok: true })
  })
}
