// ============================================================================
//  api/_lib/captions.js — generátor ASS titulků s karaoke efektem
// ============================================================================
//
//  generateAssSubtitles(wordTimestamps, style) → ASS soubor (string) pro FFmpeg
//  filtr `ass`. Karaoke: každé slovo se plynule zvýrazní (\kf) přesně v čase,
//  kdy ho hlas říká (časy z ElevenLabs alignmentu).
//
//  Barvy v ASS jsou BGR (&HBBGGRR), případně s alfou (&HAABBGGRR).
//  Highlight = PrimaryColour (zvýrazněné), normal = SecondaryColour (zatím ne).

const STYLES = {
  white_yellow: { normal: '&HFFFFFF', highlight: '&H00FFFF' }, // bílá → žlutá
  white_pink: { normal: '&HFFFFFF', highlight: '&HFF69B4' }, // bílá → růžová
  dark_white: {
    normal: '&H000000', // černá
    highlight: '&HFFFFFF', // bílá
    backColour: '&H80000000', // tmavé pozadí (box)
    box: true,
  },
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Sekundy → ASS čas H:MM:SS.cc
function assTime(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100))
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(c)}`
}

// Escape textu do ASS (závorky a backslash mají v ASS speciální význam).
function assEscape(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')')
}

export function generateAssSubtitles(wordTimestamps, style) {
  const cfg = STYLES[style]
  if (!cfg || style === 'none') return ''
  const words = Array.isArray(wordTimestamps) ? wordTimestamps : []
  if (words.length === 0) return ''

  const primary = cfg.highlight // zvýrazněné slovo (po průchodu karaoke)
  const secondary = cfg.normal // ještě nevyřčené
  const outline = '&H00000000' // černý 2px obrys
  const back = cfg.backColour || '&H00000000'
  const borderStyle = cfg.box ? 3 : 1 // 3 = neprůhledný box (tmavé pozadí)

  // Karaoke text: před každým slovem mezera s \k (mezislovní pauza), pak \kf slovo.
  let text = ''
  let prevEnd = 0
  let lastEnd = 0
  for (const w of words) {
    const start = Number(w.start) || 0
    const end = Number(w.end) || start
    // Přeskoč intonační tagy typu [pause]/[whispers] — ale ponech jejich čas.
    const isTag = /^\[.*\]$/.test(String(w.word).trim())
    const gapCs = Math.max(0, Math.round((start - prevEnd) * 100))
    if (gapCs > 0) text += `{\\k${gapCs}} `
    if (!isTag) {
      const durCs = Math.max(1, Math.round((end - start) * 100))
      text += `{\\kf${durCs}}${assEscape(w.word)} `
    }
    prevEnd = end
    lastEnd = end
  }

  const startTime = assTime(0)
  const endTime = assTime(lastEnd + 0.3)

  return (
    '[Script Info]\n' +
    'ScriptType: v4.00+\n' +
    'PlayResX: 1080\n' +
    'PlayResY: 1080\n' +
    'ScaledBorderAndShadow: yes\n\n' +
    '[V4+ Styles]\n' +
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, ' +
    'OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ' +
    'ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, ' +
    'MarginR, MarginV, Encoding\n' +
    `Style: Default,DejaVu Sans,38,${primary},${secondary},${outline},${back},` +
    `-1,0,0,0,100,100,0,0,${borderStyle},2,0,2,60,60,80,1\n\n` +
    '[Events]\n' +
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
    `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text.trim()}\n`
  )
}
