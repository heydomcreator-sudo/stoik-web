// ============================================================================
//  api/projects/[id].js — detail (GET) / aktualizace (PUT) / smazání (DELETE)
//  Chráněno requireAuth.
// ============================================================================

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

// Pole, která smí PUT měnit (whitelist — ostatní se ignorují).
const EDITABLE = [
  'name',
  'brand_voice',
  'visual_identity',
  'cta_enabled',
  'cta_type',
  'cta_value',
  'slide_count',
  'elevenlabs_voice_id',
  'caption_style',
  'active_generation_id',
  'hook_enabled',
  'hook_position',
  'hook_image_url',
  'hook_image_prompt',
]

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    const { id } = req.query
    const db = supabaseAdmin()

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      if (!data) return res.status(404).json({ error: 'Projekt nenalezen' })
      return res.status(200).json(data)
    }

    if (req.method === 'PUT') {
      const patch = {}
      for (const key of EDITABLE) {
        if (req.body && key in req.body) patch[key] = req.body[key]
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Žádná data k aktualizaci' })
      }
      const { data, error } = await db
        .from('projects')
        .update(patch)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      if (!data) return res.status(404).json({ error: 'Projekt nenalezen' })
      return res.status(200).json(data)
    }

    if (req.method === 'DELETE') {
      const { error } = await db.from('projects').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ error: 'Method Not Allowed' })
  })
}
