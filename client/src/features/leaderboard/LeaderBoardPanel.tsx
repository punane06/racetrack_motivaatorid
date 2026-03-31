import { useEffect, useMemo, useState } from 'react'

import type { LapData } from '@shared/lap'
import type { RaceMode, RaceState } from '@shared/race'
import type { Driver, RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'

type LeaderRow = {
  carNumber: number
  driverName: string
  currentLap: number
  fastestLapMs: number | null
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatLap(ms: number | null): string {
  if (ms === null) {
    return '—'
  }

  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function modeLabel(mode: RaceMode): string {
  switch (mode) {
    case 'safe':
      return 'GREEN FLAG'
    case 'hazard':
      return 'YELLOW FLAG'
    case 'danger':
      return 'RED FLAG'
    case 'finish':
      return 'CHEQUERED FLAG'
  }
}

function getDisplaySession(state: RaceState): RaceSession | null {
  if (state.activeSessionId) {
    return state.sessions.find((session) => session.id === state.activeSessionId) ?? null
  }

  if (state.lastFinishedSessionId) {
    return state.sessions.find((session) => session.id === state.lastFinishedSessionId) ?? null
  }

  return null
}

function joinRows(drivers: Driver[], lapData: LapData[]): LeaderRow[] {
  const byCar = new Map<number, LapData>(lapData.map((lap) => [lap.carNumber, lap]))

  return drivers
    .map((driver) => {
      const lap = byCar.get(driver.carNumber)
      return {
        carNumber: driver.carNumber,
        driverName: driver.name,
        currentLap: lap?.currentLap ?? 0,
        fastestLapMs: lap?.fastestLapMs ?? null,
      }
    })
    .sort((a, b) => {
      if (a.fastestLapMs === null && b.fastestLapMs === null) return a.carNumber - b.carNumber
      if (a.fastestLapMs === null) return 1
      if (b.fastestLapMs === null) return -1
      if (a.fastestLapMs !== b.fastestLapMs) return a.fastestLapMs - b.fastestLapMs
      return a.carNumber - b.carNumber
    })
}

export function LeaderBoardPanel() {
  const [state, setState] = useState<RaceState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onStateUpdated = (nextState: RaceState) => setState(nextState)
    const onRaceTick = (timeRemainingSeconds: number) => {
      setState((prev) => (prev ? { ...prev, timeRemainingSeconds } : prev))
    }

    const fetchState = () => {
      appSocket.emit('state:get', (currentState: RaceState) => setState(currentState))
    }

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    appSocket.on('connect', fetchState)
    appSocket.on('state:updated', onStateUpdated)
    appSocket.on('race:tick', onRaceTick)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    if (appSocket.connected) {
      fetchState()
    }

    return () => {
      appSocket.off('connect', fetchState)
      appSocket.off('state:updated', onStateUpdated)
      appSocket.off('race:tick', onRaceTick)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const displaySession = useMemo(() => (state ? getDisplaySession(state) : null), [state])

  const rows = useMemo(() => {
    if (!state || !displaySession) return []
    const laps = state.activeSessionId === displaySession.id ? state.lapData : []
    return joinRows(displaySession.drivers, laps)
  }, [state, displaySession])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  if (!state) {
    return (
      <section className="panel">
        <h2>Leader Board</h2>
        <p>Connecting…</p>
      </section>
    )
  }

  return (
    <section className="panel leaderboard-panel">
      <header className="leaderboard-header">
        <h2>Leader Board</h2>
        <button type="button" onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>

      <div className="leaderboard-meta">
        <span>Mode: {modeLabel(state.mode)}</span>
        <span>Time Remaining: {formatTime(state.timeRemainingSeconds)}</span>
        <span>Session: {displaySession?.label ?? 'No session'}</span>
      </div>

      {!displaySession ? (
        <p>No active or finished session yet.</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Car</th>
              <th>Driver</th>
              <th>Current Lap</th>
              <th>Fastest Lap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.carNumber}>
                <td>{index + 1}</td>
                <td>{row.carNumber}</td>
                <td>{row.driverName}</td>
                <td>{row.currentLap}</td>
                <td>{formatLap(row.fastestLapMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}