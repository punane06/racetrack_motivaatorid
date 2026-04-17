import React, { useEffect, useState, useMemo } from 'react'
import { useToast } from '@/lib/toast'
import { useRaceState } from '@/hooks/useRaceState'
import { publicSocket } from '@/lib/socket'
import type { RaceSession } from '@shared/session'
// Flag icon for each race mode
function modeFlag(mode: RaceMode): React.ReactElement {
  switch (mode) {
    case 'safe':
      return <span title="Green flag" aria-label="Green flag" style={{fontSize: '1.5em'}}>🟩</span>;
    case 'hazard':
      return <span title="Yellow flag" aria-label="Yellow flag" style={{fontSize: '1.5em'}}>🟨</span>;
    case 'danger':
      return <span title="Red flag" aria-label="Red flag" style={{fontSize: '1.5em'}}>🟥</span>;
    case 'finish':
      return <span title="Chequered flag" aria-label="Chequered flag" style={{fontSize: '1.5em'}}>🏁</span>;
    default:
      return <span style={{fontSize: '1.5em'}}>🏁</span>;
  }
}
import type { LapData } from '@shared/lap'
import type { RaceMode, RaceState } from '@shared/race'
import { getCarColor } from '@/lib/carColors'

// From PR: helper functions
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatLap(ms: number | null): string {
  if (ms === null) return '—'
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function modeLabel(mode: RaceMode): string {
  switch (mode) {
    case 'safe': return 'GREEN FLAG'
    case 'hazard': return 'YELLOW FLAG'
    case 'danger': return 'RED FLAG'
    case 'finish': return 'CHEQUERED FLAG'
    default: return mode
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

function joinRows(drivers: any[], lapData: LapData[]): any[] {
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
  const state = useRaceState()
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { showToast } = useToast();
  const [notifiedNoSessions, setNotifiedNoSessions] = useState(false);

  useEffect(() => {
    const onSessionsUpdated = (updatedSessions: RaceSession[]) => setSessions(updatedSessions)
    publicSocket.on('sessions:updated', onSessionsUpdated)
    publicSocket.emit('state:get', (state: RaceState) => setSessions(state.sessions))
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    // Connection error toast
    const onDisconnect = () => showToast('Connection lost. Trying to reconnect…', 'error');
    publicSocket.on('disconnect', onDisconnect);
    return () => {
      publicSocket.off('sessions:updated', onSessionsUpdated)
      publicSocket.off('disconnect', onDisconnect)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [showToast])

  // Toast for no sessions (only once per mount)
  useEffect(() => {
    if (sessions.length === 0 && !notifiedNoSessions) {
      showToast('No sessions yet.', 'info');
      setNotifiedNoSessions(true);
    } else if (sessions.length > 0 && notifiedNoSessions) {
      setNotifiedNoSessions(false);
    }
  }, [sessions, showToast, notifiedNoSessions]);

  // If you add a fullscreen button here in the future, add:
  // <button ... aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}>...</button>

  // PR-ist: displaySession ja rows
  const displaySession = useMemo(() => (state ? getDisplaySession(state) : null), [state])
  const rows = useMemo(() => {
    if (!state || !displaySession) return []
    const shouldShowLaps =
      state.activeSessionId === displaySession.id ||
      state.lastFinishedSessionId === displaySession.id

    const laps = shouldShowLaps ? state.lapData : []
    return joinRows(displaySession.drivers, laps)
  }, [state, displaySession])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  // Maini fallback: kui sessions puuduvad
  if (!sessions.length && !state) {
    return (
      <section className="panel">
        <h2>Leader Board</h2>
        <p>Connecting…</p>
      </section>
    )
  }

  // PR-ist: kui state olemas, näita detailset tabelit
  if (state) {
    return (
      <section className="panel leaderboard-panel">
        <header className="leaderboard-header">
          <h2 id="leaderboard-heading">Leader Board</h2>
          <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}>
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </header>
        <div className="leaderboard-meta" aria-describedby="leaderboard-heading">
          <span><span className="sr-only">Race mode:</span> {modeLabel(state.mode)}</span>
          <span className="leaderboard-mode-flag">{modeFlag(state.mode)}</span>
          <span><span className="sr-only">Time remaining:</span> {formatTime(state.timeRemainingSeconds)}</span>
          <span><span className="sr-only">Session:</span> {displaySession?.label ?? 'No session'}</span>
        </div>
        {displaySession == null ? (
          <p role="status" aria-live="polite">No active or finished session yet.</p>
        ) : (
          <table className="leaderboard-table" aria-labelledby="leaderboard-heading">
            <thead>
              <tr>
                <th scope="col">Pos</th>
                <th scope="col">Car</th>
                <th scope="col">Driver</th>
                <th scope="col">Current Lap</th>
                <th scope="col">Fastest Lap</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.carNumber}>
                  <td>{idx + 1}</td>
                  <td>
                    <span
                      className="car-badge"
                      style={{ backgroundColor: getCarColor(row.carNumber) }}
                      title={`Car ${row.carNumber}`}
                      aria-label={`Car ${row.carNumber}`}
                    >
                      <span aria-hidden="true">🚗</span> <span className="sr-only">Car </span>{row.carNumber}
                    </span>
                  </td>
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

  // Maini fallback: lihtne sessioonide loetelu
  return (
    <section className="panel">
      <h2>Leader Board</h2>
      <p>Real-time race ranking, fastest lap, current lap and timer will appear here.</p>
      {sessions.length === 0 ? (
        <p>No sessions yet.</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="leaderboard-session">
            <h3>{session.label}</h3>
            <p>Status: {session.status}</p>
            <ul>
              {session.drivers.map((driver) => (
                <li key={driver.id}>
                  Car {driver.carNumber}: {driver.name}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
