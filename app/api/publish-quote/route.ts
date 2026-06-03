import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'heydomcreator@gmail.com'
const ZERNIO_BASE = 'https://zernio.com/api/v1'

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

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const results: { accountId: string; ok: boolean; postId?: string; error?: string }[] = []

  for (const accountId of accountIds) {
    try {
      const res = await fetch(`${ZERNIO_BASE}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          content: caption,
          media: [{ type: 'image', data: imageBase64 }],
        }),
      })

      const raw = await res.text()
      console.log(`[publish-quote] accountId=${accountId} HTTP ${res.status}:`, raw.slice(0, 300))

      if (!res.ok) {
        let errData: Record<string, unknown> = {}
        try { errData = JSON.parse(raw) } catch { /* ignore */ }
        results.push({ accountId, ok: false, error: (errData.message ?? errData.error ?? `HTTP ${res.status}`) as string })
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(raw) } catch { /* ignore */ }
        const postId = (data.post as Record<string, unknown>)?._id ?? data._id ?? data.id ?? data.postId
        results.push({ accountId, ok: true, postId: postId as string | undefined })
      }
    } catch (err) {
      results.push({ accountId, ok: false, error: err instanceof Error ? err.message : 'Chyba sítě' })
    }
  }

  const failCount = results.filter(r => !r.ok).length
  const allOk = failCount === 0

  return NextResponse.json(
    { success: allOk, results, ...(failCount > 0 ? { error: `Selhalo ${failCount} z ${results.length} sítí` } : {}) },
    { status: allOk ? 200 : 207 }
  )
}
