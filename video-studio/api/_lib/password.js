// ============================================================================
//  api/_lib/password.js — správa admin hesla (ověření + změna)
// ============================================================================
//
//  Heslo má dvě úrovně:
//    1) Uložený hash v Supabase tabulce `app_config` (key = 'admin_password_hash')
//       — to je zdroj pravdy, jakmile si heslo jednou změníš v aplikaci.
//    2) Bootstrap fallback: `ADMIN_PASSWORD` z env — platí, dokud žádný hash
//       v Supabase není (první přihlášení po nasazení).
//
//  Hash: scrypt přes vestavěný `crypto` (žádná závislost navíc), formát
//  `scrypt$<saltHex>$<hashHex>`. Porovnání v konstantním čase.

import crypto from 'node:crypto'
import { supabaseAdmin } from './supabase.js'

const CONFIG_KEY = 'admin_password_hash'

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(String(plain), salt, 64)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export function verifyHash(plain, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split('$')
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const derived = crypto.scryptSync(String(plain), salt, expected.length)
    return crypto.timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// Přečte uložený hash z Supabase. Hází, pokud Supabase není dostupný/tabulka chybí.
export async function getStoredHash() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('app_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()
  if (error) throw error
  return data?.value ?? null
}

export async function setStoredHash(hash) {
  const db = supabaseAdmin()
  const { error } = await db
    .from('app_config')
    .upsert(
      { key: CONFIG_KEY, value: hash, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  if (error) throw error
}

// Ověří heslo: nejdřív proti uloženému hashi (Supabase), při jeho absenci
// fallback na ADMIN_PASSWORD env. Když Supabase není nakonfigurovaný, tiše
// spadne na env — aby šlo přihlášení i před zapojením DB.
export async function verifyPassword(plain) {
  if (!plain) return false
  try {
    const stored = await getStoredHash()
    if (stored) return verifyHash(plain, stored)
  } catch {
    // Supabase nedostupný / tabulka neexistuje → fallback na env níže.
  }
  const env = process.env.ADMIN_PASSWORD
  if (!env) return false
  const a = Buffer.from(String(plain))
  const b = Buffer.from(String(env))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Nastaví nové heslo (uloží hash do Supabase). Vyžaduje nakonfigurovaný Supabase
// — bez něj hází (volající vrátí 503).
export async function setPassword(plain) {
  await setStoredHash(hashPassword(plain))
}
