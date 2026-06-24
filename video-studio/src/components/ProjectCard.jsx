import { useEffect, useRef, useState } from 'react'
import {
  getProject,
  updateProject,
  deleteProject,
  generateHook,
  uploadHook,
  deleteHook,
} from '../lib/projects.js'
import {
  startGeneration,
  getGenerationStatus,
  updateSlides,
  generateSlideImage,
  generateSlideAudio,
  renderVideo,
} from '../lib/generate.js'
import { downloadVideo } from '../lib/publish.js'
import { getVoices, speakSlide } from '../lib/voices.js'
import { getQueue, reorderQueue, removeFromQueue } from '../lib/queue.js'

// Typy CTA + placeholdery vstupního pole podle typu.
const CTA_TYPES = [
  { key: 'web', label: '🌐 Navštiv web', placeholder: 'URL webu' },
  { key: 'dm', label: '📩 Napiš mi DM', placeholder: 'Text výzvy pro DM' },
  { key: 'follow', label: '🔔 Sleduj účet', placeholder: '@handle účtu' },
  { key: 'free', label: '🎁 Vyzkoušej zdarma', placeholder: 'URL webu' },
  { key: 'comment', label: '💬 Komentuj níže', placeholder: 'Otázka pro komentář' },
  { key: 'contact', label: '📞 Zavolej / napiš', placeholder: 'Telefon nebo email' },
  { key: 'buy', label: '🛒 Koupit', placeholder: 'URL webu' },
  { key: 'custom', label: '✍️ Vlastní CTA', placeholder: 'Vlastní text CTA' },
]

const TABS = [{ key: 'content', label: 'Obsah' }]

export default function ProjectCard({ id, onDeleted, onUpdated }) {
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('content')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  // editovatelný stav
  const [brandVoice, setBrandVoice] = useState('')
  const [visualIdentity, setVisualIdentity] = useState('')
  const [ctaEnabled, setCtaEnabled] = useState(false)
  const [ctaType, setCtaType] = useState('web')
  const [ctaValue, setCtaValue] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [voiceId, setVoiceId] = useState('')
  const [useVoice, setUseVoice] = useState(false)
  const [voices, setVoices] = useState([])
  const [captionStyle, setCaptionStyle] = useState('white_yellow')

  // vizuální hook (obrázek na začátku/konci videa)
  const [hookEnabled, setHookEnabled] = useState(false)
  const [hookPosition, setHookPosition] = useState('start') // 'start'|'end'|'both'
  const [hookSource, setHookSource] = useState('ai') // 'ai'|'upload'
  const [hookPrompt, setHookPrompt] = useState('')
  const [hookImageUrl, setHookImageUrl] = useState(null)
  const [hookBusy, setHookBusy] = useState('') // '' | 'generate' | 'upload' | 'delete'
  const [hookError, setHookError] = useState('')
  const hookFileRef = useRef(null)

  // ukládání úprav slidů (inline editace náhledu)
  const [savingSlides, setSavingSlides] = useState(false)
  const [slidesSavedMsg, setSlidesSavedMsg] = useState('')

  // per-slide hlas: draft (vygenerováno, ještě neuloženo) + stavy
  const [draftAudio, setDraftAudio] = useState({}) // idx → audio_url
  const [audioBusy, setAudioBusy] = useState(-1) // idx právě generovaný
  const [audioSaving, setAudioSaving] = useState(-1)
  const [audioAllBusy, setAudioAllBusy] = useState(false)

  // finální render videa
  const [genVideoUrl, setGenVideoUrl] = useState(null)
  const [rendering, setRendering] = useState(false)

  // přehrávač náhledu carouselu
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerIndex, setPlayerIndex] = useState(0)
  const [playerAuto, setPlayerAuto] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const audioRef = useRef(null) // <audio> element pro voiceover
  const audioUrlsRef = useRef(new Map()) // idx → object URL (cache v sezení)
  const playerAutoRef = useRef(false)
  playerAutoRef.current = playerAuto

  // editace slidů (modal)
  const [slideEdit, setSlideEdit] = useState(null) // { index, title, text, image_prompt, isNew } | null
  const [savingSlide, setSavingSlide] = useState(false)

  // generování carouselu (Haiku + fal.ai přes /api/generate)
  const [genId, setGenId] = useState(null)
  const [genStatus, setGenStatus] = useState('') // '' | pending | generating | ready | error
  const [genSlides, setGenSlides] = useState([])
  const [genError, setGenError] = useState('')
  const [queue, setQueue] = useState([])
  const [queueBusy, setQueueBusy] = useState(false)
  const [usedMsg, setUsedMsg] = useState('')

  // stažení videa + text příspěvku ("Stáhnout")
  const [downloading, setDownloading] = useState(false)
  const [downloadCaption, setDownloadCaption] = useState(null) // text → otevřený modal
  const [captionCopied, setCaptionCopied] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setTab('content')
    getProject(id)
      .then((p) => {
        if (!alive) return
        setProject(p)
        setBrandVoice(p.brand_voice || '')
        setVisualIdentity(p.visual_identity || '')
        setCtaEnabled(!!p.cta_enabled)
        setCtaType(p.cta_type || 'web')
        setCtaValue(p.cta_value || '')
        setSlideCount(p.slide_count || 5)
        setVoiceId(p.elevenlabs_voice_id || '')
        setUseVoice(!!p.elevenlabs_voice_id)
        setCaptionStyle(p.caption_style || 'white_yellow')
        setHookEnabled(!!p.hook_enabled)
        setHookPosition(p.hook_position || 'start')
        setHookPrompt(p.hook_image_prompt || '')
        setHookImageUrl(p.hook_image_url || null)
        setHookSource('ai')
        setHookError('')
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // ── generování carouselu + fronta ──────────────────────────────────────────
  function loadQueue() {
    getQueue(id)
      .then((data) => setQueue(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  // Reset stavu generátoru při přepnutí projektu + načtení fronty.
  useEffect(() => {
    setGenId(null)
    setGenStatus('')
    setGenSlides([])
    setGenError('')
    setUsedMsg('')
    setDraftAudio({})
    setGenVideoUrl(null)
    loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Polling stavu běžící generace každé 3 s, dokud není ready/error.
  useEffect(() => {
    if (!genId || (genStatus !== 'pending' && genStatus !== 'generating')) return
    const timer = setInterval(async () => {
      try {
        const s = await getGenerationStatus(genId)
        setGenStatus(s.status)
        if (s.status === 'ready') {
          setGenSlides(Array.isArray(s.slides) ? s.slides : [])
          loadQueue()
        } else if (s.status === 'error') {
          setGenError(s.error_text || 'Generování selhalo')
          loadQueue()
        }
      } catch {
        // přechodná chyba pollingu — zkusíme zas za 3 s
      }
    }, 3000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId, genStatus])

  async function generate() {
    setGenError('')
    setGenSlides([])
    setUsedMsg('')
    setDraftAudio({})
    setGenVideoUrl(null)
    setGenStatus('pending')
    try {
      const { generation_id } = await startGeneration(id)
      setGenId(generation_id)
      loadQueue() // nová generace už je zařazená na konec fronty
    } catch (e) {
      setGenStatus('error')
      setGenError(e.message || 'Generování se nepodařilo spustit')
    }
  }

  async function openGeneration(g) {
    setGenId(g.id)
    setGenStatus(g.status)
    setGenError('')
    setGenSlides([])
    setUsedMsg('')
    setDraftAudio({})
    setGenVideoUrl(null)
    if (g.status === 'ready') {
      try {
        const s = await getGenerationStatus(g.id)
        setGenSlides(Array.isArray(s.slides) ? s.slides : [])
        setGenVideoUrl(s.video_url || null)
      } catch (e) {
        // Chybu už nezatajujeme — ať je vidět, proč se náhled neotevřel.
        setGenError(e.message || 'Načtení generace selhalo')
      }
    }
  }

  // ── per-slide hlas ─────────────────────────────────────────────────────────
  function slideSpoken(s) {
    return (s.spoken_text || `${s.title || ''}. ${s.text || ''}`).trim()
  }

  async function generateAudioForSlide(i) {
    if (!genId || !voiceId) return
    setAudioBusy(i)
    setGenError('')
    try {
      const { audio_url } = await generateSlideAudio({
        generation_id: genId,
        slide_index: i,
        text: slideSpoken(genSlides[i]),
        voice_id: voiceId,
      })
      setDraftAudio((prev) => ({ ...prev, [i]: audio_url }))
      new Audio(audio_url).play().catch(() => {}) // hned přehraj k poslechu
    } catch (e) {
      setGenError(e.message || 'Generování hlasu selhalo')
    } finally {
      setAudioBusy(-1)
    }
  }

  async function saveAudioForSlide(i) {
    const url = draftAudio[i]
    if (!url || !genId) return
    setAudioSaving(i)
    setGenError('')
    try {
      const next = genSlides.map((s, idx) =>
        idx === i ? { ...s, audio_url: url } : s,
      )
      await updateSlides(genId, next)
      setGenSlides(next)
      setGenVideoUrl(null) // změna audia → video se přerenderuje
      setDraftAudio((prev) => {
        const c = { ...prev }
        delete c[i]
        return c
      })
    } catch (e) {
      setGenError(e.message || 'Uložení hlasu selhalo')
    } finally {
      setAudioSaving(-1)
    }
  }

  // Nadabuje všechny slidy a rovnou uloží (jeden zápis) → reuse v náhledu i renderu.
  async function generateAndSaveAllAudio() {
    if (!genId || !voiceId) return
    setAudioAllBusy(true)
    setGenError('')
    try {
      const next = [...genSlides]
      for (let i = 0; i < next.length; i++) {
        setAudioBusy(i)
        const { audio_url } = await generateSlideAudio({
          generation_id: genId,
          slide_index: i,
          text: slideSpoken(next[i]),
          voice_id: voiceId,
        })
        next[i] = { ...next[i], audio_url }
        setGenSlides([...next]) // průběžně naskakují zelené tečky
      }
      await updateSlides(genId, next)
      setGenSlides(next)
      setGenVideoUrl(null)
      setDraftAudio({})
    } catch (e) {
      setGenError(e.message || 'Hromadné nadabování selhalo')
    } finally {
      setAudioBusy(-1)
      setAudioAllBusy(false)
    }
  }

  // ── odsouhlasit → vyrenderovat finální MP4 ─────────────────────────────────
  async function approveAndRender() {
    if (!genId) return
    setRendering(true)
    setGenError('')
    try {
      const { video_url } = await renderVideo(genId)
      setGenVideoUrl(video_url)
    } catch (e) {
      setGenError(e.message || 'Render videa selhal')
    } finally {
      setRendering(false)
    }
  }

  // Posune položku ve frontě (dir = -1 nahoru / +1 dolů) prohozením se sousedem.
  async function moveInQueue(index, dir) {
    const target = index + dir
    if (target < 0 || target >= queue.length) return
    const next = [...queue]
    ;[next[index], next[target]] = [next[target], next[index]]
    setQueue(next)
    setQueueBusy(true)
    try {
      await reorderQueue(
        id,
        next.map((g) => g.id),
      )
    } catch (e) {
      setGenError(e.message || 'Změna pořadí selhala')
      loadQueue()
    } finally {
      setQueueBusy(false)
    }
  }

  async function removeQueueItem(g) {
    if (!window.confirm('Odebrat tento carousel z fronty?')) return
    setQueueBusy(true)
    try {
      await removeFromQueue(g.id)
      setQueue((prev) => prev.filter((x) => x.id !== g.id))
    } catch (e) {
      setGenError(e.message || 'Odebrání selhalo')
    } finally {
      setQueueBusy(false)
    }
  }

  // „Použít" — přesune aktuální generaci na pozici 1 (manuální override).
  async function useCarousel() {
    try {
      const ids = [genId, ...queue.map((g) => g.id).filter((x) => x !== genId)]
      await reorderQueue(id, ids)
      await updateProject(id, { active_generation_id: genId })
      setUsedMsg('Přesunuto na první místo fronty ✓')
      setTimeout(() => setUsedMsg(''), 2500)
      loadQueue()
    } catch (e) {
      setGenError(e.message || 'Uložení selhalo')
    }
  }

  // Hlasy ElevenLabs načteme jednou (nezávisí na projektu).
  useEffect(() => {
    getVoices()
      .then((v) => setVoices(Array.isArray(v) ? v : []))
      .catch(() => setVoices([]))
  }, [])

  function playVoicePreview() {
    const v = voices.find((x) => x.voice_id === voiceId)
    if (v?.preview_url) new Audio(v.preview_url).play().catch(() => {})
  }

  // ── inline editace slidů v náhledu ─────────────────────────────────────────
  function updateSlideField(index, field, value) {
    setGenSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
    setSlidesSavedMsg('')
  }

  async function saveSlides() {
    if (!genId) return
    setSavingSlides(true)
    setGenError('')
    try {
      await updateSlides(genId, genSlides)
      setSlidesSavedMsg('Uloženo ✓')
      setTimeout(() => setSlidesSavedMsg(''), 2000)
    } catch (e) {
      setGenError(e.message || 'Uložení slidů selhalo')
    } finally {
      setSavingSlides(false)
    }
  }

  // ── přehrávač náhledu carouselu ────────────────────────────────────────────
  // S vybraným hlasem hraje voiceover (TTS) a slide se přepne po dohrání audia;
  // bez hlasu je každý slide 3 s (tiché listování).
  // Přehrávač má zvuk, když je vybraný hlas NEBO mají slidy uložené audio.
  const hasAudioSource = !!voiceId || genSlides.some((s) => s.audio_url)
  const hasVoice = playerOpen && hasAudioSource

  function clearAudioCache() {
    audioUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    audioUrlsRef.current.clear()
  }

  function openPlayer() {
    clearAudioCache() // slidy mohly být upravené → čerstvé audio
    setPlayerIndex(0)
    setPlayerAuto(true)
    setPlayerOpen(true)
  }
  const playerPrev = () => setPlayerIndex((i) => Math.max(0, i - 1))
  const playerNext = () =>
    setPlayerIndex((i) => Math.min(genSlides.length - 1, i + 1))

  // ⏸️/▶️ Auto — u hlasu zároveň pauzne/spustí přehrávání.
  function togglePlayerAuto() {
    setPlayerAuto((v) => {
      const next = !v
      const el = audioRef.current
      if (el) {
        if (next) el.play().catch(() => {})
        else el.pause()
      }
      return next
    })
  }

  // Klávesy ← → a ESC, dokud je přehrávač otevřený.
  useEffect(() => {
    if (!playerOpen) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') playerPrev()
      else if (e.key === 'ArrowRight') playerNext()
      else if (e.key === 'Escape') setPlayerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerOpen, genSlides.length])

  // Auto-play BEZ zvuku: každý slide 3 s, na konci se zacyklí.
  useEffect(() => {
    if (!playerOpen || !playerAuto || hasAudioSource || genSlides.length < 2)
      return
    const timer = setInterval(() => {
      setPlayerIndex((i) => (i + 1) % genSlides.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [playerOpen, playerAuto, hasAudioSource, genSlides.length])

  // Se zvukem: pro aktuální slide přehraj uložené audio (audio_url) nebo ho
  // dogeneruj hlasem projektu; po dohrání (a jen když je Auto) další slide.
  useEffect(() => {
    if (!playerOpen || !hasAudioSource) return
    let cancelled = false
    const el = audioRef.current || (audioRef.current = new Audio())

    async function run() {
      const idx = Math.min(playerIndex, genSlides.length - 1)
      const s = genSlides[idx] || {}
      const advance = () => {
        if (playerAutoRef.current) {
          setPlayerIndex((i) => (i + 1) % genSlides.length)
        }
      }
      try {
        setAudioLoading(true)
        // Zdroj audia: uložené audio_url → cache → on-the-fly TTS (jen s hlasem).
        let url = s.audio_url || audioUrlsRef.current.get(idx)
        if (!url && voiceId) {
          const text = slideSpoken(s)
          if (text) {
            url = await speakSlide(text, voiceId)
            if (cancelled) return URL.revokeObjectURL(url)
            audioUrlsRef.current.set(idx, url)
          }
        }
        if (cancelled) return
        if (!url) {
          // tento slide nemá zvuk → po 3 s pokračuj
          if (playerAutoRef.current) setTimeout(advance, 3000)
          return
        }
        el.src = url
        el.onended = advance
        if (playerAutoRef.current) await el.play().catch(() => {})
      } catch (e) {
        if (!cancelled) setGenError(e.message || 'Přehrání hlasu selhalo')
      } finally {
        if (!cancelled) setAudioLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
      el.pause()
      el.onended = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerOpen, playerIndex, hasAudioSource, voiceId, genSlides.length])

  // Úklid object URL při odmountování komponenty.
  useEffect(() => {
    return () => {
      audioUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      audioUrlsRef.current.clear()
      audioRef.current?.pause()
    }
  }, [])

  // ── přidání slidu (modal) ──────────────────────────────────────────────────
  function openSlideAdd() {
    setSlideEdit({
      index: genSlides.length,
      title: '',
      text: '',
      image_prompt: '',
      isNew: true,
    })
  }

  async function saveSlide() {
    if (!slideEdit || !genId) return
    setSavingSlide(true)
    setGenError('')
    try {
      const { index, title, text, image_prompt, isNew } = slideEdit
      let next
      if (isNew) {
        next = [...genSlides, { title, text, image_prompt, image_url: null }]
      } else {
        next = genSlides.map((s, i) => (i === index ? { ...s, title, text } : s))
      }
      await updateSlides(genId, next)
      setGenSlides(next)

      // Nový slide → vygeneruj obrázek (pokud je zadaný image_prompt).
      if (isNew && image_prompt) {
        const { image_url } = await generateSlideImage({
          generation_id: genId,
          slide_index: index,
          image_prompt,
          visual_identity: visualIdentity,
        })
        setGenSlides((prev) =>
          prev.map((s, i) => (i === index ? { ...s, image_url } : s)),
        )
      }
      setSlideEdit(null)
    } catch (e) {
      setGenError(e.message || 'Uložení slidu selhalo')
    } finally {
      setSavingSlide(false)
    }
  }

  const genBusy = genStatus === 'pending' || genStatus === 'generating'

  // ── vizuální hook ───────────────────────────────────────────────────────────
  async function handleGenerateHook() {
    if (!hookPrompt.trim()) {
      setHookError('Zadej prompt pro generování hooku')
      return
    }
    setHookBusy('generate')
    setHookError('')
    try {
      // Prompt musí být uložený — generování ho čte z projektu.
      await updateProject(id, { hook_image_prompt: hookPrompt })
      const { hook_image_url } = await generateHook(id)
      setHookImageUrl(hook_image_url)
    } catch (e) {
      setHookError(e.message || 'Generování hooku selhalo')
    } finally {
      setHookBusy('')
    }
  }

  async function handleUploadHook(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setHookBusy('upload')
    setHookError('')
    try {
      const { hook_image_url } = await uploadHook(id, file)
      setHookImageUrl(hook_image_url)
    } catch (err) {
      setHookError(err.message || 'Nahrání hooku selhalo')
    } finally {
      setHookBusy('')
      if (hookFileRef.current) hookFileRef.current.value = ''
    }
  }

  async function handleDeleteHook() {
    setHookBusy('delete')
    setHookError('')
    try {
      await deleteHook(id)
      setHookImageUrl(null)
    } catch (e) {
      setHookError(e.message || 'Smazání hooku selhalo')
    } finally {
      setHookBusy('')
    }
  }

  // ── stáhnout video + text příspěvku ───────────────────────────────────────
  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      const { video_url, caption } = await downloadVideo(id)
      // Spusť stažení MP4.
      if (video_url) {
        const a = document.createElement('a')
        a.href = video_url
        a.download = ''
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
      // Otevři modal s textem příspěvku ke zkopírování.
      setCaptionCopied(false)
      setDownloadCaption(caption || '')
      loadQueue() // generace je teď 'skipped' → zmizí z fronty
    } catch (e) {
      setError(e.message || 'Stažení videa selhalo')
    } finally {
      setDownloading(false)
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(downloadCaption || '')
      setCaptionCopied(true)
      setTimeout(() => setCaptionCopied(false), 2000)
    } catch {
      setError('Kopírování do schránky selhalo')
    }
  }

  async function save(patch, section) {
    setSaving(section)
    setSavedMsg('')
    setError('')
    try {
      const updated = await updateProject(id, patch)
      setProject(updated)
      onUpdated?.(updated)
      setSavedMsg('Uloženo ✓')
      setTimeout(() => setSavedMsg(''), 2000)
    } catch (e) {
      setError(e.message || 'Uložení selhalo')
    } finally {
      setSaving('')
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Smazat projekt „${project?.name}"? Tuto akci nelze vrátit zpět.`,
      )
    )
      return
    try {
      await deleteProject(id)
      onDeleted?.(id)
    } catch (e) {
      setError(e.message || 'Smazání selhalo')
    }
  }

  if (loading) {
    return <p className="text-neutral-500">Načítám projekt…</p>
  }
  if (error && !project) {
    return <p className="text-red-400">{error}</p>
  }

  const tabBtn = (t) =>
    `rounded-lg px-3 py-1.5 text-sm transition ${
      tab === t.key
        ? 'bg-blue-500 text-white'
        : 'text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-100'
    }`

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#222222] bg-[#111111] p-5 sm:p-6">
      {/* Hlavička */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 truncate text-lg font-medium text-neutral-100">
          <span>📁</span>
          <span className="truncate">{project?.name}</span>
        </h2>
        <button
          onClick={handleDelete}
          className="shrink-0 rounded-lg border border-red-900/60 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/40"
        >
          Smazat
        </button>
      </div>

      <hr className="my-4 border-[#222222]" />

      {/* Záložky */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tabBtn(t)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5">
        {/* ── OBSAH ─────────────────────────────────────────────────── */}
        {tab === 'content' && (
          <div className="space-y-3">
            {/* Vizuální hook */}
            <div className="space-y-3 rounded-lg border border-[#222222] bg-[#0a0a0a] p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <span>🎣</span> Vizuální hook
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={hookEnabled}
                  onChange={(e) => setHookEnabled(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                Použít vizuální hook ve videu
              </label>

              {hookEnabled && (
                <div className="space-y-4 border-t border-[#222222] pt-3">
                  {/* Pozice */}
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-300">Pozice:</p>
                    {[
                      { key: 'start', label: 'Na začátku' },
                      { key: 'end', label: 'Na konci' },
                      { key: 'both', label: 'Na začátku i na konci' },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200"
                      >
                        <input
                          type="radio"
                          name="hook_position"
                          value={opt.key}
                          checked={hookPosition === opt.key}
                          onChange={() => setHookPosition(opt.key)}
                          className="h-4 w-4 accent-blue-500"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  {/* Zdroj obrázku */}
                  <div className="space-y-3 border-t border-[#222222] pt-3">
                    <p className="text-sm text-neutral-300">Zdroj obrázku:</p>

                    {/* Generovat AI */}
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                      <input
                        type="radio"
                        name="hook_source"
                        value="ai"
                        checked={hookSource === 'ai'}
                        onChange={() => setHookSource('ai')}
                        className="h-4 w-4 accent-blue-500"
                      />
                      Generovat AI (fal.ai)
                    </label>
                    {hookSource === 'ai' && (
                      <div className="space-y-2 pl-6">
                        <textarea
                          value={hookPrompt}
                          onChange={(e) => setHookPrompt(e.target.value)}
                          rows={3}
                          placeholder="Popis obrázku hooku, např. „dramatický detail antické sochy, zlaté světlo, filmový styl…"
                          className="w-full resize-y rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleGenerateHook}
                          disabled={hookBusy === 'generate' || !hookPrompt.trim()}
                          className="rounded-lg border border-[#333333] px-3 py-1.5 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
                        >
                          {hookBusy === 'generate' ? '⏳ Generuji…' : '✨ Generovat hook'}
                        </button>
                      </div>
                    )}

                    {/* Nahrát ze souboru */}
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                      <input
                        type="radio"
                        name="hook_source"
                        value="upload"
                        checked={hookSource === 'upload'}
                        onChange={() => setHookSource('upload')}
                        className="h-4 w-4 accent-blue-500"
                      />
                      Nahrát ze souboru
                    </label>
                    {hookSource === 'upload' && (
                      <div className="space-y-1 pl-6">
                        <input
                          ref={hookFileRef}
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleUploadHook}
                          disabled={hookBusy === 'upload'}
                          className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#222222] file:px-3 file:py-1.5 file:text-sm file:text-neutral-100 hover:file:bg-[#2a2a2a]"
                        />
                        <p className="text-xs text-neutral-500">
                          {hookBusy === 'upload' ? 'Nahrávám…' : 'jpg/png, max 10 MB'}
                        </p>
                      </div>
                    )}
                  </div>

                  {hookError && <p className="text-sm text-red-400">{hookError}</p>}

                  {/* Náhled hooku */}
                  {hookImageUrl && (
                    <div className="flex items-center gap-3 border-t border-[#222222] pt-3">
                      <img
                        src={hookImageUrl}
                        alt="Náhled hooku"
                        className="h-[200px] w-[200px] rounded-lg border border-[#222222] object-cover"
                      />
                      <button
                        onClick={handleDeleteHook}
                        disabled={hookBusy === 'delete'}
                        className="rounded-lg border border-red-900/60 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/40 disabled:opacity-40"
                      >
                        {hookBusy === 'delete' ? 'Mažu…' : '🗑️ Smazat'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="block text-sm font-medium text-neutral-300">
              Hlas značky
            </label>
            <textarea
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              rows={7}
              placeholder={
                'Piš jako zkušený kouč osobního rozvoje. Tón: klidný, povzbudivý, praktický. Vyhýbej se technickému žargonu…'
              }
              className="w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-blue-500"
            />

            {/* Vizuální identita */}
            <label className="flex items-center gap-2 pt-2 text-sm font-medium text-neutral-300">
              <span>🎨</span> Vizuální identita
            </label>
            <textarea
              value={visualIdentity}
              onChange={(e) => setVisualIdentity(e.target.value)}
              rows={5}
              placeholder={
                'Záhadná postava v kapuci sedící v křesle, vždy zezadu nebo zboku, obličej nikdy není vidět, dramatické osvětlení, filmový styl…'
              }
              className="w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-blue-500"
            />
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-neutral-500">
              <span>ℹ️</span>
              <span>
                Tento popis se automaticky přidá ke každému generovanému obrázku
                v carouselu.
              </span>
            </p>

            {/* Hlas (ElevenLabs) */}
            <div className="space-y-3 rounded-lg border border-[#222222] bg-[#0a0a0a] p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <span>🎙️</span> Hlas projektu
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
                >
                  <option value="">— vyber hlas —</option>
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                    </option>
                  ))}
                  {/* Pokud projekt používá hlas, který už není v seznamu */}
                  {voiceId && !voices.some((v) => v.voice_id === voiceId) && (
                    <option value={voiceId}>{voiceId} (uložený)</option>
                  )}
                </select>
                <button
                  onClick={playVoicePreview}
                  disabled={
                    !voices.find((v) => v.voice_id === voiceId)?.preview_url
                  }
                  className="shrink-0 rounded-lg border border-[#333333] px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
                  title="Přehrát ukázku"
                >
                  ▶️
                </button>
              </div>
              {voices.length === 0 && (
                <p className="text-xs text-neutral-500">
                  Hlasy se nenačetly (zkontroluj ELEVENLABS_API_KEY).
                </p>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={useVoice}
                  onChange={(e) => setUseVoice(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                Použít hlas ve videu
              </label>

              {/* Styl titulků */}
              <div className="space-y-2 border-t border-[#222222] pt-3">
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <span>🎬</span> Styl titulků
                </p>
                {[
                  { key: 'white_yellow', label: 'Bílá → Žlutá (zvýrazněné slovo)' },
                  { key: 'white_pink', label: 'Bílá → Růžová/Fialová' },
                  { key: 'dark_white', label: 'Černá → Bílá (tmavé pozadí)' },
                  { key: 'none', label: 'Bez titulků' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200"
                  >
                    <input
                      type="radio"
                      name="caption_style"
                      value={opt.key}
                      checked={captionStyle === opt.key}
                      onChange={() => setCaptionStyle(opt.key)}
                      className="h-4 w-4 accent-blue-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Výzva k akci (CTA) */}
            <div className="space-y-3 rounded-lg border border-[#222222] bg-[#0a0a0a] p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <span>📢</span> Výzva k akci (CTA)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={ctaEnabled}
                  onChange={(e) => setCtaEnabled(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                Přidat CTA do carouselu
              </label>

              {ctaEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-neutral-300">
                      Typ CTA
                    </label>
                    <select
                      value={ctaType}
                      onChange={(e) => setCtaType(e.target.value)}
                      className="w-full rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
                    >
                      {CTA_TYPES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={ctaValue}
                    onChange={(e) => setCtaValue(e.target.value)}
                    placeholder={
                      CTA_TYPES.find((c) => c.key === ctaType)?.placeholder ||
                      'Hodnota CTA'
                    }
                    className="w-full rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  save(
                    {
                      brand_voice: brandVoice,
                      visual_identity: visualIdentity,
                      cta_enabled: ctaEnabled,
                      cta_type: ctaType,
                      cta_value: ctaValue,
                      slide_count: Math.max(1, parseInt(slideCount, 10) || 5),
                      elevenlabs_voice_id:
                        useVoice && voiceId.trim() ? voiceId.trim() : null,
                      caption_style: captionStyle,
                      hook_enabled: hookEnabled,
                      hook_position: hookPosition,
                      hook_image_prompt: hookPrompt,
                    },
                    'content',
                  )
                }
                disabled={saving === 'content'}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"
              >
                {saving === 'content' ? 'Ukládám…' : 'Uložit'}
              </button>
              {savedMsg && <span className="text-sm text-green-400">{savedMsg}</span>}
            </div>

            {/* ── GENERÁTOR ─────────────────────────────────────────── */}
            <div className="space-y-3 border-t border-[#222222] pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={generate}
                  disabled={genBusy}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  {genBusy ? 'Generuji…' : '✨ Generovat carousel'}
                </button>
                {genStatus === 'ready' && (
                  <>
                    <button
                      onClick={generate}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
                    >
                      Regenerovat
                    </button>
                    <button
                      onClick={useCarousel}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                    >
                      Použít
                    </button>
                  </>
                )}
                {usedMsg && <span className="text-sm text-green-400">{usedMsg}</span>}
              </div>

              {/* Počet slidů */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-300">Počet slidů:</label>
                <input
                  type="number"
                  min={1}
                  value={slideCount}
                  onChange={(e) => setSlideCount(e.target.value)}
                  className="w-20 rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-blue-500"
                />
                <span className="text-xs text-neutral-500">
                  ulož přes „Uložit" výše
                </span>
              </div>

              {/* Loading stav */}
              {genBusy && (
                <div className="flex items-center gap-3 rounded-lg border border-[#222222] bg-[#0a0a0a] px-4 py-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <span className="text-sm text-neutral-300">
                    {genStatus === 'pending'
                      ? 'Spouštím generování…'
                      : 'Haiku píše texty a fal.ai kreslí obrázky…'}
                  </span>
                </div>
              )}

              {/* Chyba */}
              {genStatus === 'error' && genError && (
                <p className="text-sm text-red-400">{genError}</p>
              )}

              {/* Náhled carouselu — inline editovatelné slidy */}
              {genStatus === 'ready' && genSlides.length > 0 && (
                <>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {genSlides.map((s, i) => (
                      <div
                        key={i}
                        className="w-64 shrink-0 space-y-2 overflow-hidden rounded-lg border border-[#222222] bg-[#0a0a0a] p-3"
                      >
                        {s.image_url ? (
                          <img
                            src={s.image_url}
                            alt=""
                            className="aspect-square w-full rounded object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded bg-[#1a1a1a] text-neutral-600">
                            bez obrázku
                          </div>
                        )}

                        <label className="block text-xs text-neutral-400">
                          ✏️ Titulek
                        </label>
                        <input
                          type="text"
                          value={s.title || ''}
                          onChange={(e) =>
                            updateSlideField(i, 'title', e.target.value)
                          }
                          className="w-full rounded border border-[#222222] bg-[#111111] px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
                        />

                        <label className="block text-xs text-neutral-400">
                          ✏️ Text
                        </label>
                        <textarea
                          value={s.text || ''}
                          onChange={(e) =>
                            updateSlideField(i, 'text', e.target.value)
                          }
                          rows={3}
                          className="w-full resize-y rounded border border-[#222222] bg-[#111111] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-blue-500"
                        />

                        <label className="block text-xs text-neutral-400">
                          🎙️ Mluvený text
                        </label>
                        <textarea
                          value={s.spoken_text || ''}
                          onChange={(e) =>
                            updateSlideField(i, 'spoken_text', e.target.value)
                          }
                          rows={3}
                          placeholder="Co můžeš kontrolovat? [pause] Stoici věřili… [whispers] To je svoboda."
                          className="w-full resize-y rounded border border-[#222222] bg-[#111111] px-2 py-1 text-xs text-neutral-200 placeholder-neutral-600 outline-none focus:border-blue-500"
                        />

                        {/* Hlas slidu */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => generateAudioForSlide(i)}
                            disabled={!voiceId || audioBusy === i}
                            title={voiceId ? '' : 'Nejdřív vyber hlas projektu'}
                            className="rounded border border-[#333333] px-2 py-1 text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
                          >
                            {audioBusy === i ? '⏳ Generuji…' : '🎙️ Generovat hlas'}
                          </button>
                          <button
                            onClick={() => saveAudioForSlide(i)}
                            disabled={!draftAudio[i] || audioSaving === i}
                            className="rounded border border-[#333333] px-2 py-1 text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-30"
                          >
                            {audioSaving === i ? 'Ukládám…' : '💾 Uložit hlas'}
                          </button>
                          {draftAudio[i] && (
                            <button
                              onClick={() =>
                                new Audio(draftAudio[i]).play().catch(() => {})
                              }
                              className="text-xs text-neutral-400 hover:text-neutral-100"
                              title="Přehrát ukázku"
                            >
                              ▶️
                            </button>
                          )}
                          {s.audio_url && !draftAudio[i] && (
                            <span
                              title="Hlas uložen"
                              className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* + Přidat slide */}
                    <button
                      onClick={openSlideAdd}
                      className="flex w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#333333] bg-[#0a0a0a] text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"
                    >
                      <span className="text-2xl">+</span>
                      Přidat slide
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveSlides}
                      disabled={savingSlides}
                      className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"
                    >
                      {savingSlides ? 'Ukládám…' : '💾 Uložit změny'}
                    </button>
                    <button
                      onClick={generateAndSaveAllAudio}
                      disabled={!voiceId || audioAllBusy}
                      title={voiceId ? '' : 'Nejdřív vyber hlas projektu'}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
                    >
                      {audioAllBusy ? '🎙️ Dabuji vše…' : '🎙️ Nadabovat a uložit vše'}
                    </button>
                    <button
                      onClick={openPlayer}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
                    >
                      ▶️ Přehrát náhled
                    </button>
                    <button
                      onClick={approveAndRender}
                      disabled={rendering}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-40"
                    >
                      {rendering ? '🎬 Renderuji video…' : '✅ Odsouhlasit a vyrenderovat'}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {downloading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Připravuji video…
                        </>
                      ) : (
                        '⬇️ Stáhnout video + popisek'
                      )}
                    </button>
                    {slidesSavedMsg && (
                      <span className="text-sm text-green-400">{slidesSavedMsg}</span>
                    )}
                  </div>

                  {/* Finální video */}
                  {genVideoUrl && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        🎬 Finální video
                      </p>
                      <video
                        src={genVideoUrl}
                        controls
                        className="w-full max-w-sm rounded-lg border border-[#222222]"
                      />
                    </div>
                  )}
                </>
              )}

              {/* 📋 Fronta publikování */}
              {queue.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    📋 Vygenerované (stahuje se první v pořadí)
                  </p>
                  {queue.map((g, i) => (
                    <div
                      key={g.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                        g.id === genId
                          ? 'border-violet-600/60 bg-violet-950/20'
                          : 'border-[#222222] bg-[#0a0a0a]'
                      }`}
                    >
                      <span className="shrink-0 text-sm font-medium text-neutral-500">
                        #{i + 1}
                      </span>
                      <button
                        onClick={() => openGeneration(g)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {g.preview?.image_url ? (
                          <img
                            src={g.preview.image_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#1a1a1a] text-xs text-neutral-600">
                            {g.status === 'ready' ? '🖼️' : '⏳'}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-neutral-100">
                            {g.topic || g.preview?.title || 'Bez tématu'}
                          </span>
                          <span className="block text-xs text-neutral-500">
                            {new Date(g.created_at).toLocaleDateString('cs-CZ')}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => moveInQueue(i, -1)}
                          disabled={queueBusy || i === 0}
                          className="rounded px-1.5 py-1 text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-100 disabled:opacity-30"
                          title="Posunout výše"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveInQueue(i, 1)}
                          disabled={queueBusy || i === queue.length - 1}
                          className="rounded px-1.5 py-1 text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-100 disabled:opacity-30"
                          title="Posunout níže"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeQueueItem(g)}
                          disabled={queueBusy}
                          className="rounded px-1.5 py-1 text-neutral-400 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-30"
                          title="Odebrat z fronty"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Modal — editace / přidání slidu */}
      {/* Modal: text příspěvku ke stažení */}
      {downloadCaption !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setDownloadCaption(null)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-xl border border-[#222222] bg-[#111111] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="flex items-center gap-2 text-base font-medium text-neutral-100">
              <span>📋</span> Text příspěvku
            </h3>
            <hr className="border-[#222222]" />
            <textarea
              readOnly
              value={downloadCaption}
              rows={10}
              onFocus={(e) => e.target.select()}
              className="w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-end gap-3">
              {captionCopied && (
                <span className="mr-auto text-sm text-green-400">Zkopírováno ✓</span>
              )}
              <button
                onClick={copyCaption}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"
              >
                📋 Kopírovat do schránky
              </button>
              <button
                onClick={() => setDownloadCaption(null)}
                className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {slideEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => !savingSlide && setSlideEdit(null)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-xl border border-[#222222] bg-[#111111] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-medium text-neutral-100">
              {slideEdit.isNew ? '➕ Nový slide' : '✏️ Upravit slide'}
            </h3>
            <hr className="border-[#222222]" />

            <div>
              <label className="mb-1 block text-sm text-neutral-300">Titulek</label>
              <input
                type="text"
                value={slideEdit.title}
                onChange={(e) =>
                  setSlideEdit({ ...slideEdit, title: e.target.value })
                }
                className="w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-300">Text</label>
              <textarea
                value={slideEdit.text}
                onChange={(e) =>
                  setSlideEdit({ ...slideEdit, text: e.target.value })
                }
                rows={4}
                className="w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
              />
            </div>

            {slideEdit.isNew && (
              <div>
                <label className="mb-1 block text-sm text-neutral-300">
                  Popis obrázku (image prompt)
                </label>
                <textarea
                  value={slideEdit.image_prompt}
                  onChange={(e) =>
                    setSlideEdit({ ...slideEdit, image_prompt: e.target.value })
                  }
                  rows={2}
                  placeholder="cinematic photo, …"
                  className="w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Po uložení se vygeneruje obrázek (může chvíli trvat).
                </p>
              </div>
            )}

            {genError && <p className="text-sm text-red-400">{genError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setSlideEdit(null)}
                disabled={savingSlide}
                className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
              >
                Zrušit
              </button>
              <button
                onClick={saveSlide}
                disabled={savingSlide}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"
              >
                {savingSlide ? 'Ukládám…' : 'Uložit slide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Přehrávač náhledu carouselu */}
      {playerOpen && genSlides.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setPlayerOpen(false)}
        >
          <div
            className="w-full max-w-lg space-y-3 rounded-xl border border-[#222222] bg-[#111111] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-neutral-100">
                ▶️ Náhled carouselu
              </h3>
              <button
                onClick={() => setPlayerOpen(false)}
                className="rounded px-2 py-1 text-neutral-400 hover:bg-[#1a1a1a] hover:text-neutral-100"
                title="Zavřít (Esc)"
              >
                ✕
              </button>
            </div>
            <hr className="border-[#222222]" />

            {(() => {
              const idx = Math.min(playerIndex, genSlides.length - 1)
              const cur = genSlides[idx] || {}
              return (
                <>
                  {cur.image_url ? (
                    <img
                      src={cur.image_url}
                      alt=""
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#1a1a1a] text-neutral-600">
                      bez obrázku
                    </div>
                  )}

                  <p className="text-base font-medium text-neutral-100">
                    {cur.title}
                  </p>
                  <p className="text-sm leading-relaxed text-neutral-300">
                    {cur.text}
                  </p>

                  {/* Progress + pořadí */}
                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#222222]">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${((idx + 1) / genSlides.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-sm text-neutral-400">
                      {idx + 1}/{genSlides.length}
                    </span>
                  </div>

                  {/* Navigace */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={playerPrev}
                      disabled={idx === 0}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-30"
                    >
                      ◀️ Předchozí
                    </button>
                    <button
                      onClick={togglePlayerAuto}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
                      title={hasVoice ? 'Přehrát / pozastavit hlas' : 'Auto-play 3 s / slide'}
                    >
                      {playerAuto ? '⏸️ Auto' : '▶️ Auto'}
                    </button>
                    <button
                      onClick={playerNext}
                      disabled={idx === genSlides.length - 1}
                      className="rounded-lg border border-[#333333] px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-30"
                    >
                      Další ▶️
                    </button>
                  </div>

                  {/* Mluvený text (kontrola tagů) */}
                  <div className="rounded-lg border border-[#222222] bg-[#0a0a0a] p-3">
                    <p className="mb-1 text-xs text-neutral-400">
                      🎙️ Mluvený text:
                    </p>
                    <p className="text-xs leading-relaxed text-neutral-300">
                      {cur.spoken_text || '(není vyplněn)'}
                    </p>
                  </div>

                  <p className="text-center text-xs text-neutral-500">
                    {hasVoice
                      ? audioLoading
                        ? '⏳ Načítám hlas…'
                        : '🔊 Hraje hlas projektu (slide se přepne po dohrání). Šipky ← →, Esc zavře.'
                      : 'Bez zvuku — vyber hlas v sekci 🎙️ Hlas. Šipky ← → / Auto 3 s/slide, Esc zavře.'}
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
