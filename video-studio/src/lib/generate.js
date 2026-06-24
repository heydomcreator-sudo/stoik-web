// ── Frontend klient pro /api/generate ───────────────────────────────────────
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

// Spustí generování carouselu → { generation_id }. Zpracování běží async.
export const startGeneration = (projectId) =>
  request('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  })

// Stav generování → { status, topic, slides, error_text }. Polluje se každé 3 s.
export const getGenerationStatus = (generationId) =>
  request(
    `/api/generate/status?generation_id=${encodeURIComponent(generationId)}`,
  )

// Historie posledních generací projektu → [{ id, status, topic, created_at }].
export const listGenerations = (projectId) =>
  request(`/api/generate?project_id=${encodeURIComponent(projectId)}`)

// Přepíše slidy generace (úprava textů / přidání slidu).
export const updateSlides = (generationId, slides) =>
  request(`/api/generations/${encodeURIComponent(generationId)}/slides`, {
    method: 'PUT',
    body: JSON.stringify({ slides }),
  })

// Vygeneruje obrázek pro jeden slide → { image_url }.
export const generateSlideImage = (payload) =>
  request('/api/generate/image', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// Nadabuje jeden slide a uloží MP3 do Storage → { audio_url }.
export const generateSlideAudio = (payload) =>
  request('/api/generate/slide-audio', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// Vyrenderuje finální MP4 ke generaci a uloží ho → { video_url }.
export const renderVideo = (generationId) =>
  request('/api/generate/render', {
    method: 'POST',
    body: JSON.stringify({ generation_id: generationId }),
  })
