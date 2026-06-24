import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/prihlaseni', request.url))
    }
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    const email = session.user.email?.toLowerCase()
    if (!email || !adminEmails.includes(email)) {
      return NextResponse.redirect(new URL('/uvnitr', request.url))
    }
  }

  if (pathname.startsWith('/uvnitr') && !session) {
    return NextResponse.redirect(new URL('/prihlaseni', request.url))
  }

  if ((pathname === '/prihlaseni' || pathname === '/registrace') && session) {
    return NextResponse.redirect(new URL('/uvnitr', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/uvnitr/:path*', '/admin/:path*', '/admin', '/prihlaseni', '/registrace'],
}
