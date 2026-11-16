import type { WorkoutKind } from './types'

const TZ = 'Pacific/Honolulu'

export function hawaiiDateString(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function weekdayLabel(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, day, 20, 0, 0))
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
  }).format(utc)
}

export function suggestedWorkout(dateStr: string): WorkoutKind {
  const name = weekdayLabel(dateStr)
  if (name === 'Monday' || name === 'Wednesday') return 'A'
  if (name === 'Tuesday' || name === 'Thursday') return 'B'
  if (name === 'Friday') return 'optional'
  return 'none'
}

export function shiftDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 20, 0, 0))
  return hawaiiDateString(dt)
}
