// ============================================================================
//  api/_lib/auth.js — serverový auth middleware (statické heslo + JWT v cookie)
// ============================================================================
//
//  Bezpečnostní model:
//    • Heslo (ADMIN_PASSWORD) žije POUZE na serveru v env — nikdy ve frontendu.
//    • Po ověření hesla vydáme JWT podepsaný HS256 klíčem JWT_SECRET, platnost
//      30 dní. Token jde do httpOnly cookie (ne localStorage) → odolnost vůči XSS.
//    • Každý chráněný /api/* endpoint volá requireAuth() — bez platného tokenu
//      vrací 401.
//
//  JWT je implementován ručně přes vestavěný modul `crypto`, aby projekt
//  nepotřeboval žádnou závislost navíc nad základním stackem.

import crypto from 'node:crypto'

const COOKIE_NAME = 'ws_token'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dní

// ── base64url helpers ──────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj))
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// ── JWT (HS256) ────────────────────────────────────────────────────────────
export function signToken(payload, { expiresInSeconds = MAX_AGE_SECONDS } = {}) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET není nastaven')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = { ...payload, iat: now, exp: now + expiresInSeconds }

  const data = `${b64urlJson(header)}.${b64urlJson(body)}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [h, p, sig] = parts
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest('base64url')

  if (!timingSafeEqualStr(sig, expected)) return null

  let payload
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
  return payload
}

// ── Cookie helpers ─────────────────────────────────────────────────────────
export function buildAuthCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure}`
}

export function buildClearCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`
}

function readTokenFromCookies(req) {
  const raw = req.headers?.cookie ?? ''
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const name = pair.slice(0, idx).trim()
    if (name === COOKIE_NAME) return pair.slice(idx + 1).trim()
  }
  return null
}

// ── Middleware ─────────────────────────────────────────────────────────────
// Použití na chráněném endpointu:
//   import { requireAuth } from '../_lib/auth.js'
//   export default function handler(req, res) {
//     requireAuth(req, res, () => {
//       // ... chráněná logika ...
//     })
//   }
//
// Bez platného tokenu pošle 401 a `next` se nezavolá.
export function requireAuth(req, res, next) {
  const token = readTokenFromCookies(req)
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.auth = payload
  return next()
}

export { COOKIE_NAME }
