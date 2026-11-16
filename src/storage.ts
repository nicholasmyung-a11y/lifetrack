import type { AppData, DayLog } from './types'
import { suggestedWorkout } from './dates'

const KEY = 'lifetrack-v1'

export function emptyLog(date: string): DayLog {
  return {
    date,
    weight: '',
    wakeTime: '',
    notes: '',
    workout: suggestedWorkout(date),
    workoutDone: false,
    scoops: [false, false, false, false],
    meals: { breakfast: false, lunch: false, dinner: false },
    skincare: { am: false, pm: false, shower: false },
    supplements: {
      multi: false,
      immune: false,
      turmeric: false,
      testComplex: false,
      creatine: false,
    },
    waterLiters: 0,
    study: [false, false, false],
    walk: false,
    napCap: false,
  }
}

function normalizeSupplements(raw: unknown): DayLog['supplements'] {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    multi: Boolean(s.multi),
    immune: Boolean(s.immune),
    turmeric: Boolean(s.turmeric),
    testComplex: Boolean(s.testComplex),
    creatine: Boolean(s.creatine),
  }
}

export function normalizeLog(log: DayLog): DayLog {
  return {
    ...log,
    supplements: normalizeSupplements(log.supplements),
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { logs: {} }
    const parsed = JSON.parse(raw) as AppData
    const logs: Record<string, DayLog> = {}
    for (const [k, v] of Object.entries(parsed.logs ?? {})) {
      logs[k] = normalizeLog(v)
    }
    return { logs }
  } catch {
    return { logs: {} }
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}
