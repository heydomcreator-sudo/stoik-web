// ── Frontend klient pro /api/elevenlabs ─────────────────────────────────────
// Posílá cookie (credentials) — endpoint je chráněný requireAuth.

export async function getVoices() {
  const res = await fetch('/api/elevenlabs/voices', {
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Chyba serveru')
  return data // [{ voice_id, name, preview_url }]
}

// Namluví text hlasem projektu → object URL s MP3 (přehraje se přes <audio>).
export async function speakSlide(text, voiceId) {
  const res = await fetch('/api/generate/speech', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'TTS selhalo')
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
