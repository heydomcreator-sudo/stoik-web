// ============================================================================
//  api/_lib/generate.js — jádro generování carouselu (Haiku text + fal.ai obrázky)
// ============================================================================
//
//  generateCarousel(generationId) běží asynchronně (přes waitUntil v
//  api/generate/index.js). Postup:
//    1. status → 'generating'
//    2. Haiku vygeneruje JSON (téma + 5 slidů: title, text, image_prompt)
//    3. fal.ai (flux/schnell) vygeneruje pro každý slide čtvercový obrázek 1080×1080
//    4. status → 'ready', slides = [{ title, text, image_prompt, image_url }]
//    5. při chybě: status → 'error', error_text → zpráva
//
//  POZOR: access tokeny / API klíče se nikdy nelogují.

import { fal } from '@fal-ai/client'
import { supabaseAdmin } from './supabase.js'

const HAIKU_MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Jednotný vizuální styl pro konzistenci carouselu napříč slidy.
const BRAND_IMAGE_STYLE =
  'cohesive instagram carousel style, soft natural lighting, modern, high quality'

const SYSTEM_PROMPT =
  'DŮLEŽITÉ PRAVIDLO JAZYKA:\n' +
  'Píšeš výhradně v češtině. Dodržuj přísně gramatická pravidla českého jazyka:\n' +
  '- Správný slovosled (přídavné jméno před podstatným, příslovce na správném místě)\n' +
  '- Přirozené české větné konstrukce\n' +
  '- Vyhýbej se doslovným překladům z angličtiny\n' +
  '- Nepoužívej anglický slovosled\n' +
  '- Věty musí znít přirozeně jako od rodilého mluvčího češtiny\n\n' +
  "Špatně: 'Toto je cesta k svobodě vnitřní'\n" +
  "Správně: 'Toto je cesta k vnitřní svobodě'\n" +
  "Špatně: 'Přijmi to co nemůžeš změnit ty'\n" +
  "Správně: 'Přijmi to, co ty sám změnit nemůžeš'\n\n" +
  'Před odesláním každé věty zkontroluj: Je to přirozená čeština? Zní to jako člověk?\n\n' +
  'Jsi tvůrce obsahu pro sociální sítě. Generuješ texty pro Instagram carousel. ' +
  'Responduješ POUZE JSON, žádný jiný text.'

// ── Haiku ───────────────────────────────────────────────────────────────────
// Pokyn pro poslední slide podle CTA projektu (jen když je CTA zapnuté).
function buildCtaInstruction(cta) {
  if (!cta || !cta.enabled || !cta.type) return ''
  return (
    '\nPoslední slide musí být výzva k akci.\n' +
    `Typ: ${cta.type}\n\n` +
    'Podle typu použij:\n' +
    `- web/free/buy: 'Více na ${cta.value || ''}'\n` +
    `- dm: '${cta.value || ''}'\n` +
    `- follow: 'Sleduj @${cta.value || ''}'\n` +
    `- comment: '${cta.value || ''}'\n` +
    `- contact: 'Kontakt: ${cta.value || ''}'\n` +
    `- custom: '${cta.value || ''}'\n\n` +
    'Titulek posledního slidu = výzva.\n' +
    'Text = konkrétní akce kterou má čtenář udělat.\n'
  )
}

function buildUserPrompt(brandVoice, previousTexts, cta, slideCount) {
  const n = slideCount && slideCount > 0 ? slideCount : 5
  return (
    'Jsi profesionální copywriter píšící výhradně v češtině. Máš hlubokou znalost ' +
    'české gramatiky a přirozeného českého vyjadřování.\n\n' +
    'PRAVIDLA ČEŠTINY (POVINNÁ):\n' +
    '- Přirozený český slovosled — nikdy nepřekládej doslovně z angličtiny\n' +
    '- Přídavná jména patří PŘED podstatná jména\n' +
    '- Věty musí znít jako od rodilého mluvčího\n' +
    '- Vyhýbej se knižním nebo umělým konstrukcím\n' +
    '- Používej hovorové ale kultivované výrazy\n\n' +
    'ZAKÁZANÉ konstrukce:\n' +
    "✗ 'cesta k svobodě vnitřní'\n" +
    "✓ 'cesta k vnitřní svobodě'\n" +
    "✗ 'to co nemůžeš změnit ty'\n" +
    "✓ 'to, co sám změnit nemůžeš'\n" +
    "✗ 'je důležité pro tebe'\n" +
    "✓ 'je pro tebe důležité'\n\n" +
    'STRUKTURA CAROUSELU — POVINNÁ:\n' +
    'Carousel musí vyprávět jeden ucelený příběh nebo argument. Každý slide navazuje ' +
    'na předchozí jako kapitola knihy.\n\n' +
    'Použij tuto narativní strukturu:\n' +
    '- Slide 1: Provokativní otázka nebo šokující tvrzení (háček)\n' +
    '- Slide 2: Prohloubení problému / proč to trápí lidi\n' +
    '- Slide 3-N: Postupné odhalování řešení nebo vhledu (každý slide = jeden krok)\n' +
    '- Poslední slide: Závěr + výzva k akci nebo myšlenka k zamyšlení\n\n' +
    'spoken_text musí navazovat jako plynulé vyprávění — jako by mluvčí vyprávěl ' +
    'příběh, ne četl oddělené věty.\n\n' +
    'ZAKÁZÁNO: Každý slide jako samostatná izolovaná myšlenka bez souvislosti.\n\n' +
    `Hlas značky: ${brandVoice || '(neurčeno)'}\n\n` +
    `Předchozí témata (nepřekrývej je): ${previousTexts || '(žádná)'}\n\n` +
    `Vytvoř Instagram carousel s ${n} slidy. Každý slide má: titulek (max 8 slov) ` +
    'a text (max 30 slov). Poslední slide = výzva k akci.\n' +
    buildCtaInstruction(cta) +
    '\nPro každý slide vygeneruj také spoken_text — mluvený text pro voice over. ' +
    'Používej intonační značky ElevenLabs:\n' +
    '- [pause] pro pauzu\n' +
    '- [whispers] pro šeptání\n' +
    '- [sarcastically] pro sarkasmus\n' +
    '- [giggles] pro lehkost\n' +
    '- [sighs] pro povzdech\n' +
    'spoken_text má být přirozený mluvený projev, ne čtení titulku. ' +
    'Může být delší než text slidu.\n' +
    '\nOdpověz POUZE tímto JSON:\n' +
    '{\n' +
    '  "topic": "téma carouselu",\n' +
    '  "slides": [\n' +
    '    { "title": "...", "text": "...", "image_prompt": "cinematic photo, ...", "spoken_text": "..." }\n' +
    '  ]\n' +
    '}'
  )
}

// Vytáhne JSON i z odpovědi obalené ```json … ``` nebo doprovodným textem.
function parseJsonLoose(text) {
  const cleaned = String(text)
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error('Haiku nevrátil platný JSON')
  }
}

async function callHaiku(brandVoice, previousTexts, cta, slideCount) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('Chybí ANTHROPIC_API_KEY')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key, // nikdy nelogovat
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(brandVoice, previousTexts, cta, slideCount),
        },
      ],
    }),
  })

  if (!res.ok) {
    // Logujeme jen status, ne tělo (mohlo by nepřímo prozradit kontext/klíč).
    throw new Error(`Haiku API ${res.status}`)
  }

  const data = await res.json()
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const parsed = parseJsonLoose(text)
  if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
    throw new Error('Haiku vrátil prázdný carousel')
  }
  return parsed
}

// ── fal.ai (flux/schnell) ────────────────────────────────────────────────────
// Exportováno i pro samostatné generování obrázku jednoho slidu
// (viz api/generate/image.js).
export async function generateImage(imagePrompt, visualIdentity) {
  // fal.config čte FAL_KEY z env; voláme explicitně kvůli jasnosti.
  fal.config({ credentials: process.env.FAL_KEY })

  // Pokud má projekt vizuální identitu, je vodítkem pro každý obrázek (postava,
  // styl, atmosféra) a image_prompt slidu je jen popis scény.
  const prompt = visualIdentity
    ? `${visualIdentity}. Scene: ${imagePrompt}`
    : `${imagePrompt}, ${BRAND_IMAGE_STYLE}`

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: { width: 1080, height: 1080 }, // čtverec pro Instagram
    },
  })
  const url = result?.data?.images?.[0]?.url
  if (!url) throw new Error('fal.ai nevrátilo obrázek')
  return url
}

// ── Orchestrace ───────────────────────────────────────────────────────────────
export async function generateCarousel(generationId) {
  const db = supabaseAdmin()
  try {
    await db
      .from('generations')
      .update({ status: 'generating' })
      .eq('id', generationId)

    const { data: gen, error: genErr } = await db
      .from('generations')
      .select('project_id, brand_voice_snapshot')
      .eq('id', generationId)
      .single()
    if (genErr || !gen) throw new Error('Generace nenalezena')

    // Posledních 10 hotových generací projektu — aby Haiku neopakoval témata.
    const { data: prev } = await db
      .from('generations')
      .select('topic')
      .eq('project_id', gen.project_id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(10)
    const previousTexts = (prev || [])
      .map((g) => g.topic)
      .filter(Boolean)
      .join('; ')

    // Vizuální identita + CTA projektu.
    const { data: project } = await db
      .from('projects')
      .select('visual_identity, cta_enabled, cta_type, cta_value, slide_count')
      .eq('id', gen.project_id)
      .maybeSingle()
    const visualIdentity = project?.visual_identity || ''
    const cta = {
      enabled: !!project?.cta_enabled,
      type: project?.cta_type || '',
      value: project?.cta_value || '',
    }
    const slideCount = project?.slide_count || 5

    const carousel = await callHaiku(
      gen.brand_voice_snapshot,
      previousTexts,
      cta,
      slideCount,
    )

    // Obrázky generujeme paralelně (rychlejší a v rámci limitu funkce).
    const imageUrls = await Promise.all(
      carousel.slides.map((s) => generateImage(s.image_prompt, visualIdentity)),
    )

    const slides = carousel.slides.map((s, i) => ({
      title: s.title,
      text: s.text,
      image_prompt: s.image_prompt,
      spoken_text: s.spoken_text || '',
      image_url: imageUrls[i],
    }))

    await db
      .from('generations')
      .update({ status: 'ready', topic: carousel.topic || null, slides })
      .eq('id', generationId)
  } catch (e) {
    await db
      .from('generations')
      .update({ status: 'error', error_text: e.message || 'Generování selhalo' })
      .eq('id', generationId)
  }
}
