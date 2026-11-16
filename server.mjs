import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 4173)
const DATA_DIR = path.join(__dirname, 'sync-data')
const DIST = path.join(__dirname, 'dist')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const app = express()
app.use(express.json({ limit: '2mb' }))

function codePath(code) {
  const safe = String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
  if (safe.length < 4) return null
  return { safe, file: path.join(DATA_DIR, `${safe}.json`) }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/sync/:code', (req, res) => {
  const parsed = codePath(req.params.code)
  if (!parsed) return res.status(400).json({ error: 'Invalid sync code' })
  if (!fs.existsSync(parsed.file)) {
    return res.json({ code: parsed.safe, updatedAt: 0, logs: {} })
  }
  try {
    const data = JSON.parse(fs.readFileSync(parsed.file, 'utf8'))
    res.json({
      code: parsed.safe,
      updatedAt: data.updatedAt || 0,
      logs: data.logs || {},
    })
  } catch {
    res.status(500).json({ error: 'Corrupt sync data' })
  }
})

app.put('/api/sync/:code', (req, res) => {
  const parsed = codePath(req.params.code)
  if (!parsed) return res.status(400).json({ error: 'Invalid sync code' })

  const incomingUpdatedAt = Number(req.body?.updatedAt || 0)
  const incomingLogs = req.body?.logs
  if (!incomingLogs || typeof incomingLogs !== 'object') {
    return res.status(400).json({ error: 'Missing logs' })
  }

  let existing = { updatedAt: 0, logs: {} }
  if (fs.existsSync(parsed.file)) {
    try {
      existing = JSON.parse(fs.readFileSync(parsed.file, 'utf8'))
    } catch {
      existing = { updatedAt: 0, logs: {} }
    }
  }

  // Last-write-wins, but reject stale pushes
  if (existing.updatedAt && incomingUpdatedAt < existing.updatedAt) {
    return res.status(409).json({
      error: 'Stale',
      code: parsed.safe,
      updatedAt: existing.updatedAt,
      logs: existing.logs || {},
    })
  }

  const next = {
    updatedAt: Math.max(incomingUpdatedAt, Date.now()),
    logs: incomingLogs,
  }
  fs.writeFileSync(parsed.file, JSON.stringify(next))
  res.json({ code: parsed.safe, updatedAt: next.updatedAt, logs: next.logs })
})

app.use(express.static(DIST))
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LifeTrack running on http://0.0.0.0:${PORT}`)
})
