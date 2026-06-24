// ============================================================================
//  api/projects/index.js — seznam (GET) + vytvoření (POST) projektu
//  Chráněno requireAuth.
// ============================================================================

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

// Vytvoří URL-safe slug z názvu (odstraní diakritiku i speciální znaky).
function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'projekt'
  )
}

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    const db = supabaseAdmin()

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('projects')
        .select('id, name, slug')
        .order('created_at', { ascending: true })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const name = req.body?.name?.trim()
      if (!name) return res.status(400).json({ error: 'Název je povinný' })

      // Zajisti unikátní slug (name může kolidovat).
      const base = slugify(name)
      let slug = base
      let n = 1
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: existing } = await db
          .from('projects')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        if (!existing) break
        slug = `${base}-${++n}`
      }

      const { data, error } = await db
        .from('projects')
        .insert({ name, slug })
        .select('id, name, slug')
        .single()
      if (error) return res.status(500).json({ error: error.message })

      return res.status(201).json(data)
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  })
}
