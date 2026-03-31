import { useEffect, useMemo, useState } from 'react'

import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'

function getUpcomingSession(state: RaceState): RaceSession | null {
  if (!state.upcomingSessionId) return null
  return state.sessions.find((session) => session.id === state.upcomingSessionId) ?? null
}

function shouldShowProceedMessage(state: RaceState): boolean {
  return state.activeSessionId === null && state.mode === 'danger' && state.lastFinishedSessionId !== null
}

export function NextRacePanel() {
  const [state, setState] = useState<RaceState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onStateUpdated = (nextState: RaceState) => setState(nextState)

    const fetchState = () => {
      appSocket.emit('state:get', (currentState: RaceState) => setState(currentState))
    }

    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))

    appSocket.on('connect', fetchState)
    appSocket.on('state:updated', onStateUpdated)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    if (appSocket.connected) fetchState()

    return () => {
      appSocket.off('connect', fetchState)
      appSocket.off('state:updated', onStateUpdated)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const upcoming = useMemo(() => (state ? getUpcomingSession(state) : null), [state])
  const showProceed = useMemo(() => (state ? shouldShowProceedMessage(state) : false), [state])

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
        <h2>Next Race</h2>
        <p>Connecting…</p>
      </section>
    )
  }

  return (
    <section className="panel next-race-panel">
      <header className="next-race-header">
        <h2>Next Race</h2>
        <button type="button" onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>

      {showProceed ? <p className="proceed-banner">Proceed to paddock</p> : null}

      {!upcoming ? (
        <p>No upcoming session configured.</p>
      ) : (
        <>
          <p className="muted">Session: {upcoming.label}</p>
          <table className="next-race-table">
            <thead>
              <tr>
                <th>Car</th>
                <th>Driver</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.drivers
                .slice()
                .sort((a, b) => a.carNumber - b.carNumber)
                .map((driver) => (
                  <tr key={driver.id}>
                    <td>{driver.carNumber}</td>
                    <td>{driver.name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}