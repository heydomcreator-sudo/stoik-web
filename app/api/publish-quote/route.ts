import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'heydomcreator@gmail.com'
const ZERNIO_BASE = 'https://zernio.com/api/v1'

async function getAuthedSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

async function requireAdmin() {
  const supabase = await getAuthedSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || session.user.email !== ADMIN_EMAIL) return null
  return { session, supabase }
}

// Upload base64 PNG do Supabase Storage → vrátí veřejnou URL
async function uploadImageToStorage(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>,
  imageBase64: string
): Promise<string | null> {
  try {
    const buffer = Buffer.from(imageBase64, 'base64')
    const fileName = `quote_${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('quote-images')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      console.error('[publish-quote] Storage upload error:', uploadError.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('quote-images')
      .getPublicUrl(fileName)

    console.log('[publish-quote] Image uploaded → URL:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (err) {
    console.error('[publish-quote] uploadImageToStorage exception:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let imageBase64: string, caption: string, accountIds: string[]
  try {
    ;({ imageBase64, caption, accountIds } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!imageBase64 || !caption || !Array.isArray(accountIds) || accountIds.length === 0) {
    return NextResponse.json({ error: 'Chybí imageBase64, caption nebo accountIds' }, { status: 400 })
  }

  if (!process.env.ZERNIO_API_KEY) {
    return NextResponse.json({ error: 'ZERNIO_API_KEY není nastavený' }, { status: 500 })
  }

  const { supabase } = auth

  // 1. Načti účty z DB — potřebujeme platform pro každý zernio_account_id
  const { data: accounts, error: dbError } = await supabase
    .from('social_accounts')
    .select('zernio_account_id, platform, account_name')
    .in('zernio_account_id', accountIds)

  console.log('[publish-quote] Accounts from DB:', JSON.stringify(accounts))
  if (dbError) console.error('[publish-quote] DB error:', dbError.message)

  // 2. Nahraj obrázek do Supabase Storage → získej veřejnou URL
  const imageUrl = await uploadImageToStorage(supabase, imageBase64)
  console.log('[publish-quote] imageUrl for Zernio:', imageUrl ?? '(none — bude odesláno bez obrázku)')

  // 3. Zernio POST pro každý účet — formát dle Craftreel publishPost
  const results: { accountId: string; ok: boolean; postId?: string; error?: string }[] = []

  for (const accountId of accountIds) {
    const account = accounts?.find(a => a.zernio_account_id === accountId)
    const platform = account?.platform ?? 'instagram'

    const body: Record<string, unknown> = {
      content: caption,
      platforms: [{ platform, accountId }],
      publishNow: true,
      ...(imageUrl ? { mediaItems: [{ type: 'image', url: imageUrl }] } : {}),
    }

    console.log(`[publish-quote] Zernio request body (${platform} / ${accountId}):`, JSON.stringify(body).slice(0, 600))

    try {
      const res = await fetch(`${ZERNIO_BASE}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const responseText = await res.text()
      console.log(`[publish-quote] Zernio response:`, res.status, responseText.slice(0, 500))

      if (!res.ok) {
        let errData: Record<string, unknown> = {}
        try { errData = JSON.parse(responseText) } catch { /* ignore */ }
        results.push({ accountId, ok: false, error: (errData.message ?? errData.error ?? `HTTP ${res.status}`) as string })
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(responseText) } catch { /* ignore */ }
        const post = data.post as Record<string, unknown> | undefined
        const postId = post?._id ?? post?.id ?? post?.postId ?? post?.platformPostId
          ?? data._id ?? data.id ?? data.postId
          ?? (data.posts as Record<string, unknown>[])?.[0]?._id
          ?? (data.posts as Record<string, unknown>[])?.[0]?.id
          ?? null
        console.log(`[publish-quote] postId extracted:`, postId, '| keys:', Object.keys(data).join(','))
        results.push({ accountId, ok: true, postId: postId as string | undefined })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chyba sítě'
      console.error(`[publish-quote] fetch exception for ${accountId}:`, msg)
      results.push({ accountId, ok: false, error: msg })
    }
  }

  const failCount = results.filter(r => !r.ok).length
  const allOk = failCount === 0

  return NextResponse.json(
    { success: allOk, results, ...(failCount > 0 ? { error: `Selhalo ${failCount} z ${results.length} sítí` } : {}) },
    { status: allOk ? 200 : 207 }
  )
}
