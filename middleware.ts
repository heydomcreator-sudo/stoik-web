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
