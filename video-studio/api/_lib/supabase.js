// ── Service-role Supabase klient (z foundation.js, SEKCE 1C) ───────────────
// Běží POUZE na serveru (api/), obchází RLS. Service-role klíč se nikdy nesmí
// dostat do frontend bundlu — proto je tenhle modul jen v api/_lib.
import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase není nakonfigurován (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
