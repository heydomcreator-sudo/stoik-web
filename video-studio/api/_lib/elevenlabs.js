// ============================================================================
//  api/_lib/elevenlabs.js — text-to-speech (ElevenLabs)
// ============================================================================
//
//  generateSpeech(text, voiceId) → Buffer s MP3 daty.
//  API klíč (ELEVENLABS_API_KEY) žije jen v env a nikdy se neloguje.

const TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

// Preferovaný model (intonační tagy) → fallback (širší dostupnost).
const PRIMARY_MODEL = 'eleven_v3'
const FALLBACK_MODEL = 'eleven_multilingual_v2'

async function ttsRequest(voiceId, key, text, modelId) {
  return fetch(`${TTS_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key, // nikdy nelogovat
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })
}

export async function generateSpeech(text, voiceId) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('Chybí ELEVENLABS_API_KEY')
  if (!voiceId) throw new Error('Chybí voiceId')

  let res = await ttsRequest(voiceId, key, text, PRIMARY_MODEL)

  // Pokud primární model (eleven_v3) není dostupný / je špatně zadaný → fallback.
  if (res.status === 400 || res.status === 422) {
    res = await ttsRequest(voiceId, key, text, FALLBACK_MODEL)
  }

  if (!res.ok) {
    // Logujeme jen status, ne tělo ani klíč.
    throw new Error(`ElevenLabs ${res.status}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('ElevenLabs vrátil prázdné audio')
  return buf
}

// Spojí znaky z alignmentu do slov s časy → [{ word, start, end }].
function charsToWords(alignment) {
  const chars = alignment?.characters || []
  const starts = alignment?.character_start_times_seconds || []
  const ends = alignment?.character_end_times_seconds || []
  const words = []
  let cur = null
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (/\s/.test(ch)) {
      if (cur) {
        words.push(cur)
        cur = null
      }
    } else {
      if (!cur) cur = { word: '', start: starts[i] ?? 0, end: ends[i] ?? 0 }
      cur.word += ch
      cur.end = ends[i] ?? cur.end
    }
  }
  if (cur) words.push(cur)
  return words
}

async function ttsTimestampsRequest(voiceId, key, text, modelId) {
  return fetch(`${TTS_URL}/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': key, // nikdy nelogovat
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      output_format: 'mp3_44100_128',
    }),
  })
}

// TTS s časováním → { audioBuffer, wordTimestamps }.
export async function generateSpeechWithTimestamps(text, voiceId) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('Chybí ELEVENLABS_API_KEY')
  if (!voiceId) throw new Error('Chybí voiceId')

  let res = await ttsTimestampsRequest(voiceId, key, text, PRIMARY_MODEL)
  if (res.status === 400 || res.status === 422) {
    res = await ttsTimestampsRequest(voiceId, key, text, FALLBACK_MODEL)
  }
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`)

  const data = await res.json()
  const b64 = data.audio_base64 || data.audio
  if (!b64) throw new Error('ElevenLabs nevrátil audio')
  const audioBuffer = Buffer.from(b64, 'base64')
  const wordTimestamps = charsToWords(data.alignment || data.normalized_alignment)
  return { audioBuffer, wordTimestamps }
}

// Seznam dostupných hlasů → [{ voice_id, name, preview_url }].
export async function listVoices() {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('Chybí ELEVENLABS_API_KEY')

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key }, // nikdy nelogovat
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`)

  const data = await res.json()
  return (data.voices || []).map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    preview_url: v.preview_url || null,
  }))
}
