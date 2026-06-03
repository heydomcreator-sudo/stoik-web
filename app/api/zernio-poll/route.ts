import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { listAccounts } from '@/lib/zernio'

const ADMIN_EMAIL = 'heydomcreator@gmail.com'

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
  return { session, supabase }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = req.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'Chybí platform' }, { status: 400 })

  let accounts: Record<string, unknown>[]
  try {
    accounts = await listAccounts()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Zernio listAccounts selhal'
    console.error('[zernio-poll] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const matching = accounts.filter(a => a.platform === platform)
  if (matching.length === 0) return NextResponse.json({ connected: false })

  const userId = auth.session.user.id
  const { supabase } = auth

  for (const acct of matching) {
    const accountId = acct._id as string
    const username = (acct.username ?? acct.handle ?? acct.name ?? acct._id) as string

    const { data: existing } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('zernio_account_id', accountId)
      .maybeSingle()

    if (existing) {
      await supabase.from('social_accounts')
        .update({ account_name: username, is_active: true })
        .eq('id', existing.id)
    } else {
      await supabase.from('social_accounts').insert({
        user_id: userId,
        provider: 'zernio',
        platform,
        account_name: username,
        zernio_account_id: accountId,
        is_active: true,
      })
    }
  }

  const first = matching[0]
  const username = (first.username ?? first.handle ?? first.name ?? first._id) as string
  console.log('[zernio-poll] connected:', platform, username)
  return NextResponse.json({ connected: true, username, platform })
}
