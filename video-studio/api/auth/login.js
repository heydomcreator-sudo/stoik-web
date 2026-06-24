// ============================================================================
//  api/auth/login.js — ověření hesla, vydání JWT do httpOnly cookie
// ============================================================================
//
//  POST /api/auth/login   body: { password }
//   → 200 + Set-Cookie (ws_token=JWT)  při shodě hesla
//   → 401                              při neshodě
//
//  Heslo se ověřuje přes verifyPassword(): nejdřív proti uloženému hashi
//  v Supabase (po první změně hesla), jinak fallback na ADMIN_PASSWORD env.
//  Toto je JEDINÝ veřejný /api/* endpoint — vše ostatní vyžaduje requireAuth().

import { signToken, buildAuthCookie } from '../_lib/auth.js'
import { verifyPassword } from '../_lib/password.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'Server není nakonfigurován (JWT_SECRET)' })
    return
  }

  const password = req.body?.password
  if (!(await verifyPassword(password))) {
    res.status(401).json({ error: 'Nesprávné heslo' })
    return
  }

  const token = signToken({ role: 'admin' })
  res.setHeader('Set-Cookie', buildAuthCookie(token))
  res.status(200).json({ ok: true })
}
