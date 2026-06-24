// ── Frontend klient pro /api/projects ──────────────────────────────────────
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

export const listProjects = () => request('/api/projects')

export const createProject = (name) =>
  request('/api/projects', { method: 'POST', body: JSON.stringify({ name }) })

export const getProject = (id) => request(`/api/projects/${id}`)

export const updateProject = (id, patch) =>
  request(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(patch) })

export const deleteProject = (id) =>
  request(`/api/projects/${id}`, { method: 'DELETE' })

// ── Vizuální hook ───────────────────────────────────────────────────────────
// Vygeneruje hook obrázek přes fal.ai z projects.hook_image_prompt.
export const generateHook = (projectId) =>
  request('/api/projects/hook', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, action: 'generate' }),
  })

// Smaže hook obrázek ze Storage a vynuluje hook_image_url.
export const deleteHook = (projectId) =>
  request('/api/projects/hook', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, action: 'delete' }),
  })

// Nahraje vlastní hook obrázek (multipart) — NE přes JSON `request` helper.
export const uploadHook = async (projectId, file) => {
  const form = new FormData()
  form.append('project_id', projectId)
  form.append('file', file)
  const res = await fetch('/api/projects/hook-upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: form, // Content-Type (multipart boundary) nastaví prohlížeč sám
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Nahrání hooku selhalo')
  return data
}
