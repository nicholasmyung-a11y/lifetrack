export type WorkoutKind = 'none' | 'A' | 'B' | 'full' | 'optional'

export type DayLog = {
  date: string
  weight: string
  wakeTime: string
  notes: string
  workout: WorkoutKind
  workoutDone: boolean
  scoops: boolean[]
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean }
  skincare: { am: boolean; pm: boolean; shower: boolean }
  supplements: {
    multi: boolean
    d3: boolean
    fishOil: boolean
    creatine: boolean
  }
  waterLiters: number
  study: boolean[]
  walk: boolean
  napCap: boolean
}

export type AppData = {
  logs: Record<string, DayLog>
}
