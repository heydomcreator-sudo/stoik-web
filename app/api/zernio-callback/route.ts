import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { confirmAccount } from '@/lib/zernio'

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

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let tempToken: string
  try {
    ;({ tempToken } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!tempToken) return NextResponse.json({ error: 'Chybí tempToken' }, { status: 400 })

  let accountId: string, username: string, platform: string
  try {
    ;({ accountId, username, platform } = await confirmAccount(tempToken))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Zernio: nepodařilo se potvrdit účet'
    console.error('[zernio-callback] confirmAccount error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = auth.session.user.id
  const { supabase } = auth

  // Check for existing record, then insert or update
  const { data: existing } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('zernio_account_id', accountId)
    .maybeSingle()

  let dbErr: { message: string } | null = null

  if (existing) {
    const { error } = await supabase
      .from('social_accounts')
      .update({ account_name: username, is_active: true })
      .eq('id', existing.id)
    dbErr = error
  } else {
    const { error } = await supabase
      .from('social_accounts')
      .insert({ user_id: userId, provider: 'zernio', platform, account_name: username, zernio_account_id: accountId, is_active: true })
    dbErr = error
  }

  if (dbErr) {
    console.error('[zernio-callback] db error:', dbErr.message)
    return NextResponse.json({ error: 'Nepodařilo se uložit účet: ' + dbErr.message }, { status: 500 })
  }

  console.log('[zernio-callback] connected:', platform, username)
  return NextResponse.json({ ok: true, platform, username })
}
