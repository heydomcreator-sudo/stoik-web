import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Story webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const userId = paymentIntent.metadata?.user_id
      const storyId = paymentIntent.metadata?.story_id

      if (!userId || !storyId) {
        console.error('Missing user_id or story_id in payment_intent metadata')
        return NextResponse.json({ received: true })
      }

      const { error } = await supabaseAdmin.from('story_purchases').insert({
        user_id: userId,
        story_id: storyId,
        stripe_payment_intent_id: paymentIntent.id,
      })

      if (error && !error.message.includes('duplicate')) {
        console.error('Supabase insert error:', error)
      }
    }
  } catch (error) {
    console.error('Story webhook handler error:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
