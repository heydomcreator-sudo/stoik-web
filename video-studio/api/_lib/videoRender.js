// ============================================================================
//  api/_lib/videoRender.js — slideshow MP4 z carousel slidů (server-side)
// ============================================================================
//
//  Podle foundation.js (SEKCE 3B–3D): slidy se kreslí přes @napi-rs/canvas
//  (1080×1080) a skládají FFmpegem (ffmpeg-static) do MP4 (libx264). Výsledek
//  jde do Supabase Storage bucketu "videos" (public) a vrací se public URL.
//  Hotové MP4 se pak stahuje přes api/publish/download.js.

import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import { supabaseAdmin } from './supabase.js'
import { generateSpeech, generateSpeechWithTimestamps } from './elevenlabs.js'
import { generateAssSubtitles } from './captions.js'

const ffprobePath = ffprobeStatic?.path || ffprobeStatic
const AUDIO_TAIL = 0.5 // pauza za audiem (s)
// Adresář s fontem pro libass (ass filtr nezná systémové fonty).
const FONTS_DIR = process.env.FONT_PATH
  ? path.dirname(process.env.FONT_PATH)
  : null

const W = 1080
const H = 1080
const SLIDE_SECONDS = 2
const FPS = 30
const FADE_FRAMES = 12 // ~0.4 s fade in/out

// Server nemá systémové fonty — pokud je k dispozici .ttf (FONT_PATH), zaregistruj.
// TODO: přibal do repo vlastní font (např. public/fonts/Inter.ttf) a nastav
// FONT_PATH, jinak se text na Vercelu nemusí vykreslit.
let FONT_FAMILY = 'sans-serif'
try {
  if (process.env.FONT_PATH) {
    GlobalFonts.registerFromPath(process.env.FONT_PATH, 'Brand')
    FONT_FAMILY = 'Brand'
  }
} catch {
  /* fallback na sans-serif */
}

// fetch s tvrdým timeoutem — bez něj může jedna nereagující/expirovaná remote
// URL (obrázek slidu z fal.ai, audio, hook) zaseknout celý render až do limitu
// funkce („video se jen načítá"). Po timeoutu fetch abortuje a volající spadne
// na fallback (tmavé pozadí / ticho / bez hooku).
const FETCH_TIMEOUT_MS = 20000
async function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── Kreslení jednoho slidu ───────────────────────────────────────────────────
function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

async function drawSlide(slide) {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // (1) obrázek jako pozadí (cover)
  try {
    const res = await fetchWithTimeout(slide.image_url)
    if (!res.ok) throw new Error(`image ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const img = await loadImage(buf)
    const scale = Math.max(W / img.width, H / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
  } catch {
    // bez obrázku → tmavé pozadí
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, W, H)
  }

  // (2) tmavý overlay (opacity 0.4)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'

  // (3) titulek nahoře — bílý, 48px, tučný
  ctx.font = `bold 48px ${FONT_FAMILY}`
  const titleLines = wrapLines(ctx, slide.title, W - 160)
  titleLines.forEach((ln, i) => ctx.fillText(ln, W / 2, 140 + i * 70))

  return canvas.encode('jpeg', 90)
}

// ── FFmpeg helper ────────────────────────────────────────────────────────────
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`)),
    )
  })
}

// Délka audio souboru v sekundách (ffprobe).
function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ])
    let out = ''
    proc.stdout.on('data', (d) => {
      out += d.toString()
    })
    proc.on('error', reject)
    proc.on('close', () => {
      const dur = parseFloat(out.trim())
      resolve(Number.isFinite(dur) && dur > 0 ? dur : 0)
    })
  })
}

// Klip slidu s namluveným audiem; délka = délka audia + krátká pauza.
// assPath (volitelné) → vypálí karaoke titulky.
async function buildAudioClip(framePath, audioPath, clipPath, assPath) {
  const dur = await probeDuration(audioPath)
  const total = (dur || 2) + AUDIO_TAIL
  const fadeSec = FADE_FRAMES / FPS
  const fadeOut = Math.max(0, total - fadeSec)
  const filters = [
    `fade=t=in:st=0:d=${fadeSec}`,
    `fade=t=out:st=${fadeOut}:d=${fadeSec}`,
  ]
  if (assPath) {
    // ass filtr: cesta + adresář s fontem (libass jinak font nenajde).
    filters.push(
      FONTS_DIR ? `ass=${assPath}:fontsdir=${FONTS_DIR}` : `ass=${assPath}`,
    )
  }
  filters.push('format=yuv420p')
  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-framerate', String(FPS),
    '-t', String(total),
    '-i', framePath,
    '-i', audioPath,
    '-vf', filters.join(','),
    '-af', 'apad', // doplň ticho, ať audio pokryje i závěrečnou pauzu
    '-t', String(total),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    clipPath,
  ])
}

// Klip slidu BEZ namluvení, ale s tichou audio stopou (2 s) — aby v audio
// videu měly všechny klipy stejné streamy a concat je spojil.
async function buildSilentAudioClip(framePath, clipPath) {
  const total = SLIDE_SECONDS
  const fadeSec = FADE_FRAMES / FPS
  const fadeOut = Math.max(0, total - fadeSec)
  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-framerate', String(FPS),
    '-t', String(total),
    '-i', framePath,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf',
    `fade=t=in:st=0:d=${fadeSec},fade=t=out:st=${fadeOut}:d=${fadeSec},format=yuv420p`,
    '-t', String(total),
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    clipPath,
  ])
}

// Hook klip z obrázku (1.5 s, závěrečná zatmívačka). Streamy musí ladit se
// slidy, aby je concat spojil: s audiem přidá tichou stopu, bez audia jen video.
const HOOK_SECONDS = 1.5
async function buildHookClip(imagePath, clipPath, withAudio) {
  const vf =
    `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
    'fade=t=out:st=1.2:d=0.3,format=yuv420p'
  if (withAudio) {
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-framerate', String(FPS),
      '-t', String(HOOK_SECONDS),
      '-i', imagePath,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf', vf,
      '-t', String(HOOK_SECONDS),
      '-map', '0:v',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      clipPath,
    ])
  } else {
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-t', String(HOOK_SECONDS),
      '-i', imagePath,
      '-r', String(FPS),
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      clipPath,
    ])
  }
}

// ── Veřejný kontrakt: render slideshow do MP4 (outputPath) ───────────────────
//   renderSlideshow(slides, outputPath, voiceId?) → outputPath
//   slides = [{ title, text, image_url }]
//   voiceId vyplněné → každý slide má namluvené audio (ElevenLabs) a jeho délku
//   řídí audio; jinak je každý slide 2 s beze zvuku.
//   hook (volitelné) = { enabled, position: 'start'|'end'|'both', imageUrl }
//   → vloží 1.5s obrázkový hook na začátek/konec.
export async function renderSlideshow(slides, outputPath, voiceId, captionStyle, hook) {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('renderSlideshow: prázdné slidy')
  }
  // Karaoke titulky: jen když je hlas a styl není 'none'.
  const withCaptions = !!voiceId && captionStyle && captionStyle !== 'none'
  // Audio použijeme, pokud má projekt hlas NEBO má aspoň jeden slide uložené audio.
  const withAudio = withCaptions || !!voiceId || slides.some((s) => s.audio_url)
  const dir = await mkdtemp(path.join(tmpdir(), 'slideshow-'))
  try {
    // 1) vykresli každý slide jako JPEG a slož krátký klip s fade in/out
    const clips = []
    for (let i = 0; i < slides.length; i++) {
      const jpeg = await drawSlide(slides[i])
      const framePath = path.join(dir, `frame_${i}.jpg`)
      await writeFile(framePath, jpeg)
      const clipPath = path.join(dir, `clip_${i}.mp4`)

      if (withCaptions) {
        // S titulky: potřebujeme časování → nadabuj s timestampy (bez reuse).
        const spoken =
          slides[i].spoken_text ||
          `${slides[i].title || ''}. ${slides[i].text || ''}`.trim()
        const { audioBuffer, wordTimestamps } =
          await generateSpeechWithTimestamps(spoken, voiceId)
        const audioPath = path.join(dir, `audio_${i}.mp3`)
        await writeFile(audioPath, audioBuffer)
        const ass = generateAssSubtitles(wordTimestamps, captionStyle)
        let assPath
        if (ass) {
          assPath = path.join(dir, `captions_${i}.ass`)
          await writeFile(assPath, ass)
        }
        await buildAudioClip(framePath, audioPath, clipPath, assPath)
      } else if (withAudio) {
        // Zdroj audia: uložené slide.audio_url (reuse, neplatíme znovu) →
        // jinak nadabuj přes hlas projektu → jinak ticho (2 s).
        const audioPath = path.join(dir, `audio_${i}.mp3`)
        let audioReady = false
        if (slides[i].audio_url) {
          try {
            const r = await fetchWithTimeout(slides[i].audio_url)
            if (r.ok) {
              await writeFile(audioPath, Buffer.from(await r.arrayBuffer()))
              audioReady = true
            }
          } catch {
            /* spadne na TTS / ticho níže */
          }
        }
        if (!audioReady && voiceId) {
          const audioText =
            slides[i].spoken_text ||
            `${slides[i].title || ''}. ${slides[i].text || ''}`.trim()
          const audioBuf = await generateSpeech(audioText, voiceId)
          await writeFile(audioPath, audioBuf)
          audioReady = true
        }
        if (audioReady) {
          await buildAudioClip(framePath, audioPath, clipPath)
        } else {
          await buildSilentAudioClip(framePath, clipPath)
        }
      } else {
        const fadeOutStart = SLIDE_SECONDS * FPS - FADE_FRAMES
        await runFfmpeg([
          '-y',
          '-loop', '1',
          '-t', String(SLIDE_SECONDS),
          '-i', framePath,
          '-r', String(FPS),
          '-vf',
          `fade=t=in:st=0:d=${FADE_FRAMES / FPS},` +
            `fade=t=out:st=${fadeOutStart / FPS}:d=${FADE_FRAMES / FPS},format=yuv420p`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          clipPath,
        ])
      }
      clips.push(clipPath)
    }

    // 1b) volitelný vizuální hook na začátek/konec
    let orderedClips = clips
    if (hook && hook.enabled && hook.imageUrl) {
      try {
        const hookImg = path.join(dir, 'hook.jpg')
        const r = await fetchWithTimeout(hook.imageUrl)
        if (!r.ok) throw new Error(`hook image ${r.status}`)
        await writeFile(hookImg, Buffer.from(await r.arrayBuffer()))
        const hookClip = path.join(dir, 'hook_clip.mp4')
        await buildHookClip(hookImg, hookClip, withAudio)
        const pos = hook.position || 'start'
        if (pos === 'end') orderedClips = [...clips, hookClip]
        else if (pos === 'both') orderedClips = [hookClip, ...clips, hookClip]
        else orderedClips = [hookClip, ...clips]
      } catch {
        // hook selhal → vyrenderuj video bez něj (nezahazujeme celý výstup)
        orderedClips = clips
      }
    }

    // 2) spoj klipy. Bez audia mají klipy identické kodeky → -c copy.
    //    S audiem raději překódujeme, ať sedí A/V streamy a časování.
    const listPath = path.join(dir, 'list.txt')
    await writeFile(listPath, orderedClips.map((c) => `file '${c}'`).join('\n'))
    await runFfmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      ...(withAudio
        ? ['-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p']
        : ['-c', 'copy']),
      '-movflags', '+faststart',
      outputPath,
    ])

    return outputPath
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

// ── Render + upload do Storage bucketu "videos" → public URL ──────────────────
// Používá cron: vyrenderuje MP4, nahraje a vrátí veřejnou URL.
// voiceId (může být null) → video s namluveným komentářem.
export async function renderAndUploadSlideshow(
  slides,
  storageKey,
  voiceId,
  captionStyle,
  hook,
) {
  const outputPath = path.join(tmpdir(), `${storageKey.replace(/\W+/g, '_')}.mp4`)
  try {
    await renderSlideshow(slides, outputPath, voiceId, captionStyle, hook)
    const buffer = await readFile(outputPath)

    const db = supabaseAdmin()
    const { error } = await db.storage
      .from('videos')
      .upload(storageKey, buffer, { contentType: 'video/mp4', upsert: true })
    if (error) throw new Error(`Storage upload: ${error.message}`)

    const { data } = db.storage.from('videos').getPublicUrl(storageKey)
    if (!data?.publicUrl) throw new Error('Storage: chybí public URL')
    return data.publicUrl
  } finally {
    await rm(outputPath, { force: true }).catch(() => {})
  }
}
