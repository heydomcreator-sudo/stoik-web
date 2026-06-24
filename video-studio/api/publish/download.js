// ============================================================================
//  api/publish/download.js — vyrenderuje video ke stažení + složí text příspěvku
//  POST /api/publish/download   body: { project_id }
//  Chráněno requireAuth.
// ============================================================================
//
//  Ruční „Stáhnout" — vezme generaci z fronty (nebo aktivní), vyrenderuje MP4
//  a vrátí jeho public URL + hotový text příspěvku (titulek, text, CTA,
//  hashtagy) k překopírování. Generaci pak označí 'skipped'.

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'
import { renderAndUploadSlideshow } from '../_lib/videoRender.js'

export const config = { maxDuration: 300 }

// CTA text dle typu/hodnoty — zrcadlí mapování z generate.js (buildCtaInstruction).
function buildCtaText(project) {
  if (!project.cta_enabled || !project.cta_type) return ''
  const v = (project.cta_value || '').trim()
  if (!v) return ''
  switch (project.cta_type) {
    case 'web':
    case 'free':
    case 'buy':
      return `Více na ${v}`
    case 'follow':
      return `Sleduj @${v.replace(/^@/, '')}`
    case 'contact':
      return `Kontakt: ${v}`
    case 'dm':
    case 'comment':
    case 'custom':
    default:
      return v
  }
}

// 3–5 hashtagů odvozených z tématu generace (bez diakritiky, bez stop-slov).
const STOPWORDS = new Set([
  'pro', 'ale', 'jak', 'kdyz', 'nebo', 'tak', 'tim', 'tohle', 'tento', 'tato',
  'jako', 'jsou', 'jsem', 'bude', 'byla', 'bylo', 'jeho', 'jeji', 'ktery',
  'ktera', 'ktere', 'the', 'and', 'for', 'with', 'vase', 'vasi', 'tvuj',
])
function buildHashtags(topic) {
  if (!topic) return ''
  const words = String(topic)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // odstraň diakritiku
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  const uniq = [...new Set(words)].slice(0, 5)
  return uniq.map((w) => `#${w}`).join(' ')
}

function buildCaption(slides, project, topic) {
  const first = slides[0] || {}
  const parts = []
  if (first.title) parts.push(first.title)
  if (first.text) parts.push(first.text)
  const cta = buildCtaText(project)
  if (cta) parts.push(cta)
  const tags = buildHashtags(topic)
  if (tags) parts.push(tags)
  return parts.join('\n\n')
}

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(400).json({ error: 'Method Not Allowed' })
    }

    const projectId = req.body?.project_id
    if (!projectId) {
      return res.status(400).json({ error: 'project_id je povinný' })
    }

    const db = supabaseAdmin()

    // 1) projekt včetně hook + CTA sloupců
    const { data: project, error: pErr } = await db
      // '*' je odolné vůči chybějícímu sloupci (např. hook_* bez migrace schématu).
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle()
    if (pErr) return res.status(500).json({ error: pErr.message })
    if (!project) return res.status(404).json({ error: 'Projekt nenalezen' })

    // 2) první generace ve frontě → 3) jinak aktivní
    let gen = null
    const { data: queued } = await db
      .from('generations')
      .select('*')
      .eq('project_id', projectId)
      .eq('queue_status', 'queued')
      .order('queue_position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    gen = queued || null

    if (!gen && project.active_generation_id) {
      const { data } = await db
        .from('generations')
        .select('*')
        .eq('id', project.active_generation_id)
        .maybeSingle()
      gen = data || null
    }
    if (!gen) {
      return res.status(400).json({ error: 'Žádná generace ke stažení (fronta je prázdná)' })
    }

    const slides = Array.isArray(gen.slides) ? gen.slides : []
    if (slides.length === 0) {
      return res.status(400).json({ error: 'Generace nemá slidy' })
    }
    if (gen.status !== 'ready') {
      return res.status(400).json({ error: 'Generace ještě není hotová' })
    }

    try {
      // 4) render (reuse hotového videa, jinak vyrenderuj a ulož)
      let videoUrl = gen.video_url || null
      if (!videoUrl) {
        videoUrl = await renderAndUploadSlideshow(
          slides,
          `${projectId}/${gen.id}.mp4`,
          project.elevenlabs_voice_id || null,
          project.caption_style || null,
          {
            enabled: !!project.hook_enabled,
            position: project.hook_position || 'start',
            imageUrl: project.hook_image_url || null,
          },
        )
        await db.from('generations').update({ video_url: videoUrl }).eq('id', gen.id)
      }

      // 5) vyřaď generaci z fronty (skipped) — stažené video se nemá
      //    znovu automaticky publikovat příštím cronem.
      await db
        .from('generations')
        .update({ queue_status: 'skipped' })
        .eq('id', gen.id)

      // 6) text příspěvku
      const caption = buildCaption(slides, project, gen.topic)

      // 7) odpověď
      return res.status(200).json({ video_url: videoUrl, caption })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Příprava videa selhala' })
    }
  })
}
