import { useEffect, useState } from 'react'
import { useToast } from '@/lib/toast'
import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'
import { getCarColor } from '@/lib/carColors'

// Helper: get upcoming session
function getUpcomingSession(state: RaceState | null): RaceSession | null {
  return state?.sessions.find((session) => session.id === state.upcomingSessionId) ?? null;
}

function shouldShowProceedMessage(state: RaceState | null): boolean {
  return !!state && state.activeSessionId === null && state.mode === 'danger' && state.lastFinishedSessionId !== null;
}

export function NextRacePanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { showToast } = useToast();
  const [notifiedNoUpcoming, setNotifiedNoUpcoming] = useState(false);
  const upcoming = getUpcomingSession(raceState);
  const showProceed = shouldShowProceedMessage(raceState);



  useEffect(() => {
    const onStateUpdated = (state: RaceState) => {
      setRaceState(state)
    }
    appSocket.on('state:updated', onStateUpdated)
    appSocket.emit('state:get', (state) => {
      setRaceState(state)
    })
    const fetchState = () => {
      appSocket.emit('state:get', (currentState: RaceState) => setRaceState(currentState))
    }
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    appSocket.on('connect', fetchState)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    if (appSocket.connected) fetchState()
    const onDisconnect = () => showToast('Connection lost. Trying to reconnect…', 'error');
    appSocket.on('disconnect', onDisconnect);
    return () => {
      appSocket.off('state:updated', onStateUpdated)
      appSocket.off('connect', fetchState)
      appSocket.off('disconnect', onDisconnect)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [showToast])

  // Toast for no upcoming session (only once per mount)
  useEffect(() => {
    if (upcoming == null && !notifiedNoUpcoming) {
      showToast('No upcoming session configured.', 'info');
      setNotifiedNoUpcoming(true);
    } else if (upcoming != null && notifiedNoUpcoming) {
      setNotifiedNoUpcoming(false);
    }
  }, [upcoming, showToast, notifiedNoUpcoming]);



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
                .sort((a: { carNumber: number }, b: { carNumber: number }) => a.carNumber - b.carNumber)
                .map((driver: { id: string; carNumber: number; name: string }) => (
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