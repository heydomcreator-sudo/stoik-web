// ============================================================================
//  api/auth/change-password.js — změna admin hesla (chráněno requireAuth)
// ============================================================================
//
//  POST /api/auth/change-password   body: { currentPassword, newPassword }
//   → 200                 heslo změněno (nový hash uložen v Supabase)
//   → 400                 nové heslo nesplňuje pravidla
//   → 401                 chybí/neplatný token, nebo špatné současné heslo
//   → 503                 Supabase není nakonfigurovaný (nelze uložit)

import { requireAuth } from '../_lib/auth.js'
import { verifyPassword, setPassword } from '../_lib/password.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  requireAuth(req, res, async () => {
    const { currentPassword, newPassword } = req.body || {}

    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Nové heslo musí mít aspoň 6 znaků' })
      return
    }
    if (!(await verifyPassword(currentPassword))) {
      res.status(401).json({ error: 'Současné heslo je nesprávné' })
      return
    }

    try {
      await setPassword(newPassword)
    } catch {
      res.status(503).json({
        error:
          'Změnu hesla nelze uložit — Supabase není nakonfigurovaný (tabulka app_config).',
      })
      return
    }

    res.status(200).json({ ok: true })
  })
}
