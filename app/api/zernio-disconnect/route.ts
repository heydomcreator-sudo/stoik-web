import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { disconnectZernioAccount } from '@/lib/zernio'

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

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let zernioAccountId: string
  try {
    ;({ zernio_account_id: zernioAccountId } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!zernioAccountId) return NextResponse.json({ error: 'Chybí zernio_account_id' }, { status: 400 })

  const userId = auth.session.user.id
  const { supabase } = auth

  // Ověř ownership
  const { data: acct } = await supabase
    .from('social_accounts')
    .select('id, platform')
    .eq('user_id', userId)
    .eq('zernio_account_id', zernioAccountId)
    .maybeSingle()

  if (!acct) {
    console.warn(`[zernio-disconnect] účet ${zernioAccountId} nenalezen pro user ${userId}`)
    return NextResponse.json({ error: 'Účet nenalezen' }, { status: 404 })
  }

  // Odpoj ze Zernio
  try {
    await disconnectZernioAccount(zernioAccountId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Zernio disconnect selhal'
    console.error('[zernio-disconnect] Zernio error:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Smaž z DB
  const { error: dbErr } = await supabase
    .from('social_accounts')
    .delete()
    .eq('zernio_account_id', zernioAccountId)
    .eq('user_id', userId)

  if (dbErr) {
    console.error('[zernio-disconnect] DB delete error:', dbErr.message)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  console.log(`[zernio-disconnect] hotovo: user=${userId} account=${zernioAccountId}`)
  return NextResponse.json({ ok: true })
}
