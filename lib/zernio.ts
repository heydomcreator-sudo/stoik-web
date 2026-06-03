const BASE_URL = 'https://zernio.com/api/v1'

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function apiGet(path: string): Promise<Record<string, unknown>> {
  if (!process.env.ZERNIO_API_KEY) throw new Error('ZERNIO_API_KEY není nastavený')
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, { headers: authHeaders() })
  const raw = await res.text()
  console.log(`[zernio] GET ${url} → HTTP ${res.status}:`, raw.slice(0, 500))
  let data: Record<string, unknown>
  try { data = JSON.parse(raw) } catch {
    throw new Error(`Zernio vrátil non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error((data.message ?? data.error ?? `Zernio error ${res.status}`) as string)
  return data
}

async function apiPost(path: string, body: unknown): Promise<Record<string, unknown>> {
  if (!process.env.ZERNIO_API_KEY) throw new Error('ZERNIO_API_KEY není nastavený')
  const url = `${BASE_URL}${path}`
  const bodyStr = JSON.stringify(body)
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: bodyStr })
  const raw = await res.text()
  console.log(`[zernio] POST ${url} → HTTP ${res.status}:`, raw.slice(0, 500))
  let data: Record<string, unknown>
  try { data = JSON.parse(raw) } catch {
    throw new Error(`Zernio vrátil non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error((data.message ?? data.error ?? `Zernio error ${res.status}`) as string)
  return data
}

async function getProfileId(): Promise<string> {
  if (process.env.ZERNIO_PROFILE_ID) return process.env.ZERNIO_PROFILE_ID

  const data = await apiPost('/profiles', { name: 'klid-v-chaosu-admin' })
  const profile = data.profile as Record<string, unknown> | undefined
  const profileId = profile?._id ?? data._id ?? data.id ?? data.profileId
  if (!profileId) throw new Error(`Zernio: chybí profileId. Pole: ${Object.keys(data).join(', ')}`)
  console.log(`[zernio] Nový profil vytvořen. Přidej do env vars: ZERNIO_PROFILE_ID=${profileId}`)
  return profileId as string
}

export async function getConnectUrl(platform: string, callbackUrl: string): Promise<{ authUrl: string }> {
  const profileId = await getProfileId()
  const params = new URLSearchParams({ profileId, callbackUrl })
  const data = await apiGet(`/connect/${platform}?${params}`)
  const authUrl = (data.authUrl ?? data.url ?? data.connectUrl ?? data.redirect_url ?? data.oauth_url) as string
  if (!authUrl) throw new Error(`Zernio: chybí authUrl. Dostupná pole: ${Object.keys(data).join(', ')}`)
  return { authUrl }
}

export async function confirmAccount(tempToken: string) {
  const data = await apiGet(`/accounts?connectToken=${encodeURIComponent(tempToken)}`)
  const accounts = data.accounts as Record<string, unknown>[] | undefined
  const acct = Array.isArray(accounts) ? accounts[0] : (data.account as Record<string, unknown>)
  if (!acct) throw new Error('Zernio: žádný účet nenalezen pro tento token')
  return {
    accountId: acct._id as string,
    username: (acct.username ?? acct.handle ?? acct.name ?? acct._id) as string,
    platform: acct.platform as string,
  }
}

export async function listAccounts(): Promise<Record<string, unknown>[]> {
  const data = await apiGet('/accounts')
  return (data.accounts as Record<string, unknown>[]) ?? []
}

export async function disconnectZernioAccount(zernioAccountId: string): Promise<{ ok: boolean }> {
  if (!process.env.ZERNIO_API_KEY) throw new Error('ZERNIO_API_KEY není nastavený')
  const url = `${BASE_URL}/accounts/${zernioAccountId}`
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  const raw = await res.text()
  console.log(`[zernio] DELETE /accounts/${zernioAccountId} → HTTP ${res.status}:`, raw.slice(0, 200))
  if (!res.ok && res.status !== 404) {
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(raw) } catch { /* ignore */ }
    throw new Error((data.message ?? data.error ?? `Zernio DELETE error ${res.status}`) as string)
  }
  return { ok: true }
}
