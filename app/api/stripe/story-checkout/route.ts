import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { storyId } = await req.json()

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

    const { data: story } = await supabase
      .from('stories')
      .select('id, title, price_czk, stripe_price_id')
      .eq('id', storyId)
      .eq('published', true)
      .single()

    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

    const lineItem = story.stripe_price_id
      ? { price: story.stripe_price_id, quantity: 1 }
      : {
          price_data: {
            currency: 'czk',
            product_data: { name: story.title },
            unit_amount: story.price_czk * 100,
          },
          quantity: 1,
        }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email!,
      line_items: [lineItem],
      success_url: `https://epiktetos.cz/uvnitr/youtube?success=true&story=${storyId}`,
      cancel_url: 'https://epiktetos.cz/uvnitr/youtube',
      metadata: { user_id: session.user.id, story_id: storyId },
      payment_intent_data: {
        metadata: { user_id: session.user.id, story_id: storyId },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Story checkout error:', error)
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 })
  }
}
