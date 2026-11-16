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
      d3: false,
      fishOil: false,
      creatine: false,
    },
    waterLiters: 0,
    study: [false, false, false],
    walk: false,
    napCap: false,
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { logs: {} }
    const parsed = JSON.parse(raw) as AppData
    return { logs: parsed.logs ?? {} }
  } catch {
    return { logs: {} }
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}
