import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getConnectUrl } from '@/lib/zernio'

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
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = req.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'Chybí platform' }, { status: 400 })

  const callbackUrl = new URL('/zernio-callback', req.url).toString()

  try {
    const { authUrl } = await getConnectUrl(platform, callbackUrl)
    return NextResponse.json({ authUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Zernio connect selhal'
    console.error('[zernio-connect] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
