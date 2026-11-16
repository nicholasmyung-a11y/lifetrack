import type { DayLog } from './types'

const SYNC_CODE_KEY = 'lifetrack-sync-code'
const SYNC_UPDATED_KEY = 'lifetrack-sync-updated'

export type SyncPayload = {
  code: string
  updatedAt: number
  logs: Record<string, DayLog>
}

export function loadSyncCode(): string {
  return localStorage.getItem(SYNC_CODE_KEY) || ''
}

export function saveSyncCode(code: string) {
  const clean = code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
  if (clean) localStorage.setItem(SYNC_CODE_KEY, clean)
  else localStorage.removeItem(SYNC_CODE_KEY)
  return clean
}

export function loadLocalUpdatedAt(): number {
  return Number(localStorage.getItem(SYNC_UPDATED_KEY) || 0)
}

export function saveLocalUpdatedAt(ts: number) {
  localStorage.setItem(SYNC_UPDATED_KEY, String(ts))
}

export function makeSyncCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export async function pullSync(code: string): Promise<SyncPayload> {
  const res = await fetch(`/api/sync/${encodeURIComponent(code)}`)
  if (!res.ok) throw new Error('Pull failed')
  return res.json()
}

export async function pushSync(
  code: string,
  logs: Record<string, DayLog>,
  updatedAt: number,
): Promise<SyncPayload> {
  const res = await fetch(`/api/sync/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs, updatedAt }),
  })
  if (res.status === 409) {
    const stale = (await res.json()) as SyncPayload
    return stale
  }
  if (!res.ok) throw new Error('Push failed')
  return res.json()
}

/** Merge day logs: prefer newer day fields by comparing JSON? Use remote if remote updatedAt newer overall — caller handles LWW. */
export function mergeLogs(
  local: Record<string, DayLog>,
  remote: Record<string, DayLog>,
): Record<string, DayLog> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  const out: Record<string, DayLog> = {}
  for (const key of keys) {
    const a = local[key]
    const b = remote[key]
    if (!a) out[key] = b
    else if (!b) out[key] = a
    else {
      // Prefer the side with more completed core checks; tie → remote
      const score = (d: DayLog) =>
        d.scoops.filter(Boolean).length +
        Number(d.meals.breakfast) +
        Number(d.meals.lunch) +
        Number(d.meals.dinner) +
        Number(d.workoutDone) +
        Number(d.supplements.multi) +
        d.waterLiters
      out[key] = score(b) >= score(a) ? b : a
    }
  }
  return out
}
