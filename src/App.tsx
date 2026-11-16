import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hawaiiDateString, shiftDate, weekdayLabel } from './dates'
import { emptyLog, loadData, normalizeLog, saveData } from './storage'
import {
  loadLocalUpdatedAt,
  loadSyncCode,
  makeSyncCode,
  mergeLogs,
  pullSync,
  pushSync,
  saveLocalUpdatedAt,
  saveSyncCode,
} from './sync'
import { COACH_TIPS } from './coachTips'
import type { DayLog, WorkoutKind } from './types'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function countTrue(flags: boolean[]) {
  return flags.filter(Boolean).length
}

function titleCaseWords(text: string) {
  return text
    .split(' ')
    .map((word) => {
      if (!word) return word
      if (word === '·' || word === '↔' || word === '/') return word
      if (/^[A-Z0-9]+$/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export default function App() {
  const today = useMemo(() => hawaiiDateString(), [])
  const [activeDate, setActiveDate] = useState(today)
  const [logs, setLogs] = useState<Record<string, DayLog>>(() => loadData().logs)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installHint, setInstallHint] = useState(false)
  const [syncCode, setSyncCode] = useState(() => loadSyncCode())
  const [syncInput, setSyncInput] = useState(() => loadSyncCode())
  const [syncStatus, setSyncStatus] = useState('Not Linked')
  const [syncBusy, setSyncBusy] = useState(false)
  const [openTip, setOpenTip] = useState<string | null>(COACH_TIPS[0]?.id ?? null)
  const [syncOpen, setSyncOpen] = useState(false)
  const updatedAtRef = useRef(loadLocalUpdatedAt())
  const skipNextPush = useRef(false)

  const log = normalizeLog(logs[activeDate] ?? emptyLog(activeDate))
  const weekday = weekdayLabel(activeDate)
  const isToday = activeDate === today
  const isPc = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches,
    [],
  )

  useEffect(() => {
    if (!logs[activeDate]) {
      setLogs((prev) => ({ ...prev, [activeDate]: emptyLog(activeDate) }))
    }
  }, [activeDate, logs])

  useEffect(() => {
    saveData({ logs })
  }, [logs])

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true
    if (isIos && !isStandalone) setInstallHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const bumpAndMaybePush = useCallback(
    async (nextLogs: Record<string, DayLog>) => {
      if (!syncCode) return
      if (skipNextPush.current) {
        skipNextPush.current = false
        return
      }
      const ts = Date.now()
      updatedAtRef.current = ts
      saveLocalUpdatedAt(ts)
      try {
        setSyncStatus('Syncing…')
        const result = await pushSync(syncCode, nextLogs, ts)
        if (result.updatedAt && result.updatedAt !== ts) {
          // Server had newer or merged response
          skipNextPush.current = true
          updatedAtRef.current = result.updatedAt
          saveLocalUpdatedAt(result.updatedAt)
          setLogs(result.logs)
        }
        setSyncStatus(`Synced · ${syncCode}`)
      } catch {
        setSyncStatus('Sync Offline — Will Retry')
      }
    },
    [syncCode],
  )

  useEffect(() => {
    if (!syncCode) return
    const handle = window.setTimeout(() => {
      void bumpAndMaybePush(logs)
    }, 700)
    return () => window.clearTimeout(handle)
  }, [logs, syncCode, bumpAndMaybePush])

  const refreshFromCloud = useCallback(async () => {
    if (!syncCode) return
    setSyncBusy(true)
    try {
      const remote = await pullSync(syncCode)
      if (remote.updatedAt > updatedAtRef.current) {
        skipNextPush.current = true
        updatedAtRef.current = remote.updatedAt
        saveLocalUpdatedAt(remote.updatedAt)
        setLogs((local) => mergeLogs(local, remote.logs))
        setSyncStatus(`Pulled · ${syncCode}`)
      } else if (remote.updatedAt === 0 && Object.keys(remote.logs).length === 0) {
        await pushSync(syncCode, logs, updatedAtRef.current || Date.now())
        setSyncStatus(`Linked · ${syncCode}`)
      } else {
        setSyncStatus(`Up To Date · ${syncCode}`)
      }
    } catch {
      setSyncStatus('Could Not Reach Sync Server')
    } finally {
      setSyncBusy(false)
    }
  }, [syncCode, logs])

  useEffect(() => {
    if (!syncCode) return
    void refreshFromCloud()
    const id = window.setInterval(() => {
      void refreshFromCloud()
    }, 8000)
    return () => window.clearInterval(id)
  }, [syncCode]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateLog(patch: Partial<DayLog>) {
    setLogs((prev) => {
      const current = prev[activeDate] ?? emptyLog(activeDate)
      return { ...prev, [activeDate]: { ...current, ...patch } }
    })
  }

  function goDate(date: string) {
    setActiveDate(date)
    setLogs((prev) => ({
      ...prev,
      [date]: prev[date] ?? emptyLog(date),
    }))
  }

  async function installApp() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  function createSync() {
    const code = makeSyncCode()
    const saved = saveSyncCode(code)
    setSyncCode(saved)
    setSyncInput(saved)
    setSyncStatus(`Created · Enter ${saved} On Your Other Device`)
    const ts = Date.now()
    updatedAtRef.current = ts
    saveLocalUpdatedAt(ts)
    void pushSync(saved, logs, ts)
  }

  function joinSync() {
    const saved = saveSyncCode(syncInput)
    if (!saved) {
      setSyncStatus('Enter A Valid Code')
      return
    }
    setSyncCode(saved)
    setSyncStatus(`Linking ${saved}…`)
  }

  function unlinkSync() {
    saveSyncCode('')
    setSyncCode('')
    setSyncInput('')
    setSyncStatus('Not Linked')
  }

  const scoopCount = countTrue(log.scoops)
  const mealCount =
    Number(log.meals.breakfast) + Number(log.meals.lunch) + Number(log.meals.dinner)
  const studyCount = countTrue(log.study)
  const skinCount =
    Number(log.skincare.am) + Number(log.skincare.pm) + Number(log.skincare.shower)

  const recentWeights = Object.values(logs)
    .filter((l) => l.weight.trim() !== '')
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)

  const workoutBlurb =
    log.workout === 'A'
      ? 'Push-Ups, Shoulder Press, Goblet Squat, RDL'
      : log.workout === 'B'
        ? 'Rows, Rear-Delt Fly, Lunge/Split Squat, Glute Bridge'
        : log.workout === 'full'
          ? 'Full-Body All-Around Session'
          : log.workout === 'optional'
            ? 'Short Pump Or Skip'
            : 'Rest — Food And Scoops Still Count'

  return (
    <div className={`shell ${isPc ? 'is-pc' : ''}`}>
      <aside className="side">
        <header className="brand">
          <h1>LifeTrack</h1>
          <p>
            {isPc ? 'PC Dashboard' : 'Phone Tracker'} · Scoops, Meals, Lifts
          </p>
        </header>

        {installEvent ? (
          <div className="install">
            <div>
              <strong>Install on your phone</strong>
              <span>Add to home screen for one-tap access</span>
            </div>
            <button className="btn primary" type="button" onClick={installApp}>
              Install
            </button>
          </div>
        ) : null}

        {installHint && !installEvent ? (
          <div className="install">
            <div>
              <strong>iPhone install</strong>
              <span>Share → Add to Home Screen</span>
            </div>
            <button className="btn ghost" type="button" onClick={() => setInstallHint(false)}>
              Got it
            </button>
          </div>
        ) : null}

        <div className="stats side-stats">
          <div className="stat">
            <b>{scoopCount}/4</b>
            <span>Scoops</span>
          </div>
          <div className="stat">
            <b>{mealCount}/3</b>
            <span>Meals</span>
          </div>
          <div className="stat">
            <b>{log.workoutDone ? 'Yes' : log.workout === 'none' ? 'Rest' : 'No'}</b>
            <span>Lift</span>
          </div>
          <div className="stat">
            <b>{log.waterLiters}L</b>
            <span>Water</span>
          </div>
        </div>

        <section className={`card sync-card ${syncOpen ? 'open' : 'collapsed'}`}>
          <button
            type="button"
            className="sync-toggle"
            onClick={() => setSyncOpen((v) => !v)}
            aria-expanded={syncOpen}
          >
            <span>Phone ↔ PC Sync</span>
            <span className="sync-toggle-meta">
              {syncCode ? syncCode : 'Off'}
              <span className="sync-chevron" aria-hidden>
                {syncOpen ? '▾' : '▸'}
              </span>
            </span>
          </button>
          {syncOpen ? (
            <div className="sync-body">
              <div className="field">
                <label htmlFor="sync">Sync Code</label>
                <input
                  id="sync"
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                />
              </div>
              <div className="row">
                {!syncCode ? (
                  <>
                    <button className="btn primary" type="button" onClick={createSync}>
                      Create Code
                    </button>
                    <button className="btn" type="button" onClick={joinSync}>
                      Join Code
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn primary"
                      type="button"
                      disabled={syncBusy}
                      onClick={() => void refreshFromCloud()}
                    >
                      Sync Now
                    </button>
                    <button className="btn ghost" type="button" onClick={unlinkSync}>
                      Unlink
                    </button>
                  </>
                )}
              </div>
              <p className="hint">{titleCaseWords(syncStatus)}</p>
            </div>
          ) : null}
        </section>
      </aside>

      <main className="app">
        <section className="card">
          <div className="nav">
            <button className="btn" type="button" onClick={() => goDate(shiftDate(activeDate, -1))}>
              Prev
            </button>
            <div className="nav-center">
              <strong>{weekday}</strong>
              <small>
                {activeDate}
                {isToday ? ' · Today' : ''}
              </small>
            </div>
            <button className="btn" type="button" onClick={() => goDate(shiftDate(activeDate, 1))}>
              Next
            </button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              className={`btn ${isToday ? 'primary' : ''}`}
              type="button"
              onClick={() => goDate(today)}
            >
              Jump To Today
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => updateLog(emptyLog(activeDate))}
            >
              Reset Day
            </button>
          </div>
        </section>

        <div className="desktop-grid">
          <section className="card">
            <h2>Body</h2>
            <div className="field">
              <label htmlFor="weight">Weight (lb)</label>
              <input
                id="weight"
                inputMode="decimal"
                value={log.weight}
                onChange={(e) => updateLog({ weight: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="wake">Wake Time</label>
              <input
                id="wake"
                value={log.wakeTime}
                onChange={(e) => updateLog({ wakeTime: e.target.value })}
              />
            </div>
          </section>

          <section className="card">
            <h2>Mutant Mass · 4 Scoops</h2>
            {['Scoop 1', 'Scoop 2', 'Scoop 3', 'Scoop 4'].map((label, i) => (
              <label key={label} className={`check ${log.scoops[i] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={log.scoops[i]}
                  onChange={(e) => {
                    const next = [...log.scoops]
                    next[i] = e.target.checked
                    updateLog({ scoops: next })
                  }}
                />
                <span>{label}</span>
                {log.scoops[i] ? <em className="badge on">Done</em> : null}
              </label>
            ))}
          </section>

          <section className="card">
            <h2>Meals</h2>
            {(
              [
                ['breakfast', 'Breakfast'],
                ['lunch', 'Lunch / Snack'],
                ['dinner', 'Dinner'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={`check ${log.meals[key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={log.meals[key]}
                  onChange={(e) =>
                    updateLog({ meals: { ...log.meals, [key]: e.target.checked } })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </section>

          <section className="card">
            <h2>Workout</h2>
            <div className="field">
              <label htmlFor="workout">Today’s plan</label>
              <select
                id="workout"
                value={log.workout}
                onChange={(e) => updateLog({ workout: e.target.value as WorkoutKind })}
              >
                <option value="A">Day A · Push + Legs</option>
                <option value="B">Day B · Pull + Legs</option>
                <option value="full">Full Body / All-Around</option>
                <option value="optional">Optional Short</option>
                <option value="none">Rest Day</option>
              </select>
            </div>
            <div className="toggle-row">
              <span>Completed</span>
              <button
                type="button"
                className={`switch ${log.workoutDone ? 'on' : ''}`}
                aria-pressed={log.workoutDone}
                onClick={() => updateLog({ workoutDone: !log.workoutDone })}
              >
                <i />
              </button>
            </div>
            <p className="hint">{workoutBlurb}</p>
          </section>

          <section className="card">
            <h2>Supplements</h2>
            {(
              [
                ['multi', 'Multivitamin (1 tablet)'],
                ['immune', 'Immune Softgels (optional)'],
                ['turmeric', 'Turmeric + Ginger'],
                ['testComplex', 'Testosterone Complex'],
                ['creatine', 'Creatine 3–5g'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={`check ${log.supplements[key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={Boolean(log.supplements[key])}
                  onChange={(e) =>
                    updateLog({
                      supplements: {
                        multi: Boolean(log.supplements.multi),
                        immune: Boolean(log.supplements.immune),
                        turmeric: Boolean(log.supplements.turmeric),
                        testComplex: Boolean(log.supplements.testComplex),
                        creatine: Boolean(log.supplements.creatine),
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </section>

          <section className="card">
            <h2>Water</h2>
            <p
              style={{
                margin: '0 0 10px',
                fontFamily: 'var(--display)',
                fontSize: '1.4rem',
              }}
            >
              {log.waterLiters} / 4 L
            </p>
            <div className="row">
              <button
                className="btn"
                type="button"
                onClick={() =>
                  updateLog({
                    waterLiters: Math.max(0, +(log.waterLiters - 0.5).toFixed(1)),
                  })
                }
              >
                −0.5L
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() =>
                  updateLog({
                    waterLiters: Math.min(8, +(log.waterLiters + 0.5).toFixed(1)),
                  })
                }
              >
                +0.5L
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => updateLog({ waterLiters: 0 })}
              >
                Reset
              </button>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.min(100, (log.waterLiters / 4) * 100)}%` }} />
            </div>
          </section>

          <section className="card">
            <h2>Skincare / Hygiene</h2>
            {(
              [
                ['am', 'Morning Face (Cleanse + Moisturize)'],
                ['shower', 'Post-Lift Shower'],
                ['pm', 'Night Face (Cleanse + Moisturize)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className={`check ${log.skincare[key] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={log.skincare[key]}
                  onChange={(e) =>
                    updateLog({ skincare: { ...log.skincare, [key]: e.target.checked } })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
            <p className="hint">{skinCount}/3 hygiene checks</p>
          </section>

          <section className="card">
            <h2>Study / Habits</h2>
            {['Study Block 1', 'Study Block 2', 'Study Block 3'].map((label, i) => (
              <label key={label} className={`check ${log.study[i] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={log.study[i]}
                  onChange={(e) => {
                    const next = [...log.study]
                    next[i] = e.target.checked
                    updateLog({ study: next })
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
            <label className={`check ${log.walk ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={log.walk}
                onChange={(e) => updateLog({ walk: e.target.checked })}
              />
              <span>Easy Walk 10–20 Min</span>
            </label>
            <label className={`check ${log.napCap ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={log.napCap}
                onChange={(e) => updateLog({ napCap: e.target.checked })}
              />
              <span>Nap Kept Short (≤45 Min)</span>
            </label>
            <p className="hint">Study {studyCount}/3</p>
          </section>
        </div>

        <section className="card">
          <h2>Notes</h2>
          <div className="field">
            <label htmlFor="notes">Day Notes</label>
            <textarea
              id="notes"
              value={log.notes}
              onChange={(e) => updateLog({ notes: e.target.value })}
            />
          </div>
        </section>

        <section className="card coach-card">
          <h2>Coach Tips</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Free Built-In Tips From Your Plan — Tap One To Open.
          </p>
          <div className="coach-list">
            {COACH_TIPS.map((tip) => {
              const open = openTip === tip.id
              return (
                <div key={tip.id} className={`coach-item ${open ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="coach-q"
                    onClick={() => setOpenTip(open ? null : tip.id)}
                  >
                    {tip.title}
                  </button>
                  {open ? <p className="coach-a">{tip.body}</p> : null}
                </div>
              )
            })}
          </div>
        </section>

        {recentWeights.length > 0 ? (
          <section className="card">
            <h2>Recent Weights</h2>
            <ul className="weights">
              {recentWeights.map((w) => (
                <li key={w.date}>
                  <span>{w.date}</span>
                  <strong>{w.weight} lb</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="footer-note">
          Open this same site on PC and phone. Link both with one sync code. Data also saves
          on each device offline.
        </p>
      </main>
    </div>
  )
}
