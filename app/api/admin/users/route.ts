import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'heydomcreator@gmail.com'
const TRIAL_DAYS = 7

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || session.user.email !== ADMIN_EMAIL) return null
  return session
}

type SubRow = {
  user_id: string
  status: string
  current_period_end: string | null
}

function computeSubscription(createdAt: string, sub?: SubRow) {
  if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
    return {
      label: sub.status === 'trialing' ? 'Trial' : 'Předplatné',
      state: 'active' as const,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      daysLeft: 0,
    }
  }

  // Žádné platné předplatné → spočítej 7denní trial od registrace
  const trialEndsAt = new Date(new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const msLeft = trialEndsAt.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))

  if (msLeft > 0) {
    return { label: `Trial (${daysLeft} dní)`, state: 'trial' as const, status: sub?.status ?? 'trial', currentPeriodEnd: null, daysLeft }
  }
  return { label: 'Vypršelo', state: 'expired' as const, status: sub?.status ?? 'none', currentPeriodEnd: sub?.current_period_end ?? null, daysLeft: 0 }
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Načti uživatele z Supabase Auth
  const { data: list, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authError) {
    console.error('[admin/users] listUsers error:', authError.message)
    return NextResponse.json({ error: 'Nepodařilo se načíst uživatele' }, { status: 500 })
  }

  // 2. Načti předplatná a indexuj podle user_id
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id, status, current_period_end')
  const subByUser = new Map<string, SubRow>()
  ;(subs as SubRow[] | null)?.forEach(s => subByUser.set(s.user_id, s))

  // 3. Slož výsledek
  const users = list.users
    .map(u => ({
      id: u.id,
      email: u.email ?? '—',
      name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || '—',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      subscription: computeSubscription(u.created_at, subByUser.get(u.id)),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const stats = {
    total: users.length,
    paying: users.filter(u => u.subscription.state === 'active').length,
    trial: users.filter(u => u.subscription.state === 'trial').length,
    expired: users.filter(u => u.subscription.state === 'expired').length,
  }

  return NextResponse.json({ users, stats })
}
