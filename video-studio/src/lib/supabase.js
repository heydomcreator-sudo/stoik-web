// ── Frontend Supabase klient (z foundation.js, SEKCE 1A) ───────────────────
// Vite vystaví jen proměnné s prefixem VITE_ (jsou veřejné — anon key je OK).
// Service-role klient sem NIKDY nepatří — ten žije pouze v api/.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
