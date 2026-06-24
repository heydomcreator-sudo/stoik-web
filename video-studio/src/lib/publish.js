// ── Frontend klient pro /api/publish ────────────────────────────────────────
// Posílá cookie (credentials) — endpoint je chráněný requireAuth.

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Chyba serveru')
  return data
}

// Vyrenderuje video ke stažení + text příspěvku → { video_url, caption }.
export const downloadVideo = (projectId) =>
  request('/api/publish/download', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  })
