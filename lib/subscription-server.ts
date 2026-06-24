import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubscriptionStatus } from './subscription'

// Serverová varianta getUserSubscriptionStatus.
// Bere už autentizovaného server klienta (createServerClient s cookies),
// takže RLS dotaz na `subscriptions` proběhne pod identitou uživatele.
// Stejná logika jako lib/subscription.ts — ten zůstává pro klientské použití.
export async function getUserSubscriptionStatusServer(
  supabase: SupabaseClient,
  userId: string,
  createdAt: string
): Promise<SubscriptionStatus> {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (sub) return { isActive: true, isTrial: false, daysLeft: 0 }
  } catch {
    // subscriptions table may not exist yet — fall through to trial check
  }

  const trialEndsAt = new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const msLeft = trialEndsAt.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))

  if (now < trialEndsAt) return { isActive: true, isTrial: true, daysLeft }

  return { isActive: false, isTrial: false, daysLeft: 0 }
}
