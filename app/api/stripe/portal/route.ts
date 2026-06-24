import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Zkus načíst stripe_customer_id z tabulky subscriptions
    let customerId: string | null = null
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (sub?.stripe_customer_id) customerId = sub.stripe_customer_id

    // 2. Fallback — dohledej zákazníka ve Stripe podle emailu
    if (!customerId && session.user.email) {
      const customers = await stripe.customers.list({ email: session.user.email, limit: 1 })
      if (customers.data.length > 0) customerId = customers.data[0].id
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Zákazník nenalezen' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://epiktetos.cz/uvnitr',
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
