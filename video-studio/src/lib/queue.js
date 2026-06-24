// ── Frontend klient pro /api/queue ──────────────────────────────────────────
// Posílá cookie (credentials) — endpointy jsou chráněné requireAuth.

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Chyba serveru')
  return data
}

// Fronta projektu (queue_status='queued') seřazená podle pořadí.
export const getQueue = (projectId) =>
  request(`/api/queue?project_id=${encodeURIComponent(projectId)}`)

// Publikované generace projektu (queue_status='published').
export const getPublished = (projectId) =>
  request(
    `/api/queue?project_id=${encodeURIComponent(projectId)}&status=published`,
  )

// Uloží nové pořadí fronty (ordered_ids = id v cílovém pořadí).
export const reorderQueue = (projectId, orderedIds) =>
  request('/api/queue/reorder', {
    method: 'PUT',
    body: JSON.stringify({ project_id: projectId, ordered_ids: orderedIds }),
  })

// Vyřadí generaci z fronty (queue_status='skipped').
export const removeFromQueue = (id) =>
  request(`/api/queue/remove?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
