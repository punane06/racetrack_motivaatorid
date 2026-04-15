import { useEffect, useState, useMemo } from 'react'
import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'
import { getCarColor } from '@/lib/carColors'

// PR-ist: abifunktsioonid
function getUpcomingSession(state: RaceState): RaceSession | null {
  if (!state.upcomingSessionId) return null
  return state.sessions.find((session) => session.id === state.upcomingSessionId) ?? null
}

function shouldShowProceedMessage(state: RaceState): boolean {
  return state.activeSessionId === null && state.mode === 'danger' && state.lastFinishedSessionId !== null
}

export function NextRacePanel() {
  // Maini loogika: raceState
  const [raceState, setRaceState] = useState<RaceState | null>(null)
  // PR-ist: täisekraan ja state
  const [state, setState] = useState<RaceState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // Maini event
    const onStateUpdated = (state: RaceState) => {
      setRaceState(state)
      setState(state)
    }
    appSocket.on('state:updated', onStateUpdated)
    appSocket.emit('state:get', (state) => {
      setRaceState(state)
      setState(state)
    })
    // PR-ist: täisekraan
    const fetchState = () => {
      appSocket.emit('state:get', (currentState: RaceState) => setState(currentState))
    }
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    appSocket.on('connect', fetchState)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    if (appSocket.connected) fetchState()
    return () => {
      appSocket.off('state:updated', onStateUpdated)
      appSocket.off('connect', fetchState)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  // PR-ist: upcoming ja showProceed
  const upcoming = useMemo(() => (state ? getUpcomingSession(state) : null), [state])
  const showProceed = useMemo(() => (state ? shouldShowProceedMessage(state) : false), [state])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  // Maini fallback: kui raceState puudub
  if (!raceState) {
    return (
      <section className="panel">
        <h2>Next Race</h2>
        <p>Connecting…</p>
      </section>
    )
  }

  // PR-ist: detailne vaade
  return (
    <section className="panel next-race-panel">
      <header className="next-race-header">
        <h2>Next Race</h2>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
        >
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>
      {showProceed ? <p className="proceed-banner">Proceed to paddock</p> : null}
      {upcoming == null ? (
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
                    <td>
                      <span
                        className="car-badge"
                        style={{ backgroundColor: getCarColor(driver.carNumber) }}
                      >
                        🚗 Car {driver.carNumber}
                      </span>
                    </td>
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