// ============================================================================
//  api/queue/index.js — publikační fronta projektu
//  GET /api/queue?project_id=…[&status=queued|published]
//  Chráněno requireAuth.
// ============================================================================
//
//  Výchozí status='queued' → položky čekající na publikaci, seřazené podle
//  queue_position. status='published' → už publikované (nejnovější první).
//  Slidy se zkracují na náhled (jen první slide), ať je payload malý.

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

function preview(slides) {
  const s = Array.isArray(slides) ? slides[0] : null
  if (!s) return null
  return { title: s.title || '', image_url: s.image_url || null }
}

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const projectId = req.query.project_id
    if (!projectId) return res.status(400).json({ error: 'project_id je povinný' })
    const status = req.query.status === 'published' ? 'published' : 'queued'

    const db = supabaseAdmin()
    let q = db
      .from('generations')
      .select('id, topic, status, created_at, queue_position, slides')
      .eq('project_id', projectId)
      .eq('queue_status', status)

    if (status === 'queued') {
      q = q
        .order('queue_position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
    } else {
      q = q.order('created_at', { ascending: false })
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const rows = (data || []).map((g) => ({
      id: g.id,
      topic: g.topic,
      status: g.status,
      created_at: g.created_at,
      queue_position: g.queue_position,
      preview: preview(g.slides),
    }))
    return res.status(200).json(rows)
  })
}
