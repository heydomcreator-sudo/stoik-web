// ============================================================================
//  api/projects/hook-upload.js — nahrání vlastního hook obrázku ze souboru
//  POST /api/projects/hook-upload   multipart/form-data: { project_id, file }
//  Chráněno requireAuth.
// ============================================================================
//
//  Uloží nahraný obrázek do Storage bucketu "hooks" jako {project_id}/hook.jpg
//  a public URL zapíše do projects.hook_image_url. Akceptuje jpg/png, max 10 MB.
//
//  Multipart parsujeme ručně (stack drží minimum závislostí) — vypneme proto
//  vestavěný body parser a čteme surový stream.

import { requireAuth } from '../_lib/auth.js'
import { supabaseAdmin } from '../_lib/supabase.js'

export const config = { api: { bodyParser: false }, maxDuration: 60 }

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const HOOK_KEY = (projectId) => `${projectId}/hook.jpg`

// Surové tělo požadavku do Bufferu (bodyParser je vypnutý).
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BYTES + 1024) {
        reject(new Error('Soubor je příliš velký (max 10 MB)'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Minimalistický parser multipart/form-data → { fields, files }.
function parseMultipart(buffer, boundary) {
  const fields = {}
  const files = {}
  const sep = Buffer.from(`--${boundary}`)
  const headerSep = Buffer.from('\r\n\r\n')

  let idx = buffer.indexOf(sep)
  while (idx !== -1) {
    const next = buffer.indexOf(sep, idx + sep.length)
    if (next === -1) break

    let partStart = idx + sep.length
    // Konec multipartu je "--boundary--".
    if (buffer[partStart] === 0x2d && buffer[partStart + 1] === 0x2d) break
    if (buffer[partStart] === 0x0d && buffer[partStart + 1] === 0x0a) partStart += 2
    const partEnd = next - 2 // odřízni \r\n před další boundary

    const headerEnd = buffer.indexOf(headerSep, partStart)
    if (headerEnd === -1 || headerEnd > partEnd) {
      idx = next
      continue
    }
    const headerStr = buffer.slice(partStart, headerEnd).toString('utf8')
    const body = buffer.slice(headerEnd + headerSep.length, partEnd)

    const nameMatch = /name="([^"]*)"/i.exec(headerStr)
    if (!nameMatch) {
      idx = next
      continue
    }
    const name = nameMatch[1]
    const filenameMatch = /filename="([^"]*)"/i.exec(headerStr)
    if (filenameMatch) {
      const ctMatch = /content-type:\s*([^\r\n]+)/i.exec(headerStr)
      files[name] = {
        filename: filenameMatch[1],
        contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
        data: body,
      }
    } else {
      fields[name] = body.toString('utf8')
    }
    idx = next
  }
  return { fields, files }
}

export default function handler(req, res) {
  requireAuth(req, res, async () => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const contentType = req.headers['content-type'] || ''
    const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
    if (!boundary) {
      return res.status(400).json({ error: 'Očekávám multipart/form-data' })
    }

    let parsed
    try {
      const raw = await readRawBody(req)
      parsed = parseMultipart(raw, (boundary[1] || boundary[2]).trim())
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Neplatný upload' })
    }

    const projectId = parsed.fields.project_id
    const file = parsed.files.file
    if (!projectId) {
      return res.status(400).json({ error: 'project_id je povinný' })
    }
    if (!file || !file.data || file.data.length === 0) {
      return res.status(400).json({ error: 'Chybí soubor' })
    }
    if (file.data.length > MAX_BYTES) {
      return res.status(400).json({ error: 'Soubor je příliš velký (max 10 MB)' })
    }
    if (!/^image\/(jpe?g|png)$/i.test(file.contentType)) {
      return res.status(400).json({ error: 'Povolené jsou jen JPG nebo PNG' })
    }

    const db = supabaseAdmin()
    try {
      const { error: stErr } = await db.storage
        .from('hooks')
        .upload(HOOK_KEY(projectId), file.data, {
          contentType: file.contentType,
          upsert: true,
        })
      if (stErr) throw new Error(`Storage upload: ${stErr.message}`)

      const { data: pub } = db.storage.from('hooks').getPublicUrl(HOOK_KEY(projectId))
      if (!pub?.publicUrl) throw new Error('Storage: chybí public URL')
      const hookImageUrl = `${pub.publicUrl}?v=${Date.now()}`

      const { error: upErr } = await db
        .from('projects')
        .update({ hook_image_url: hookImageUrl })
        .eq('id', projectId)
      if (upErr) throw new Error(upErr.message)

      return res.status(200).json({ hook_image_url: hookImageUrl })
    } catch (e) {
      return res.status(502).json({ error: e.message || 'Nahrání hooku selhalo' })
    }
  })
}
