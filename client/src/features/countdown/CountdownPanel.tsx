import { useEffect, useState } from 'react'
import type { RaceState } from '@shared/race'
import { appSocket } from '@/lib/socket'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function CountdownPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setRaceState(state)
    const onRaceTick = (remainingSeconds: number) => {
      setRaceState((prev) => (prev ? { ...prev, timeRemainingSeconds: remainingSeconds } : prev))
    }
    const fetchState = () => {
      appSocket.emit('state:get', (state: RaceState) => setRaceState(state))
    }
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))

    appSocket.on('connect', fetchState)
    appSocket.on('state:updated', onStateUpdated)
    appSocket.on('race:tick', onRaceTick)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    if (appSocket.connected) fetchState()

    return () => {
      appSocket.off('connect', fetchState)
      appSocket.off('state:updated', onStateUpdated)
      appSocket.off('race:tick', onRaceTick)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  if (!raceState) {
    return (
      <section className="panel countdown-panel">
        <h2>Race Countdown</h2>
        <p>Connecting…</p>
      </section>
    )
  }

  return (
    <section className="panel countdown-panel">
      <header className="countdown-header">
        <h2>Race Countdown</h2>
        <button type="button" onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>

      <div className="countdown-time">{formatTime(raceState.timeRemainingSeconds)}</div>
      {raceState.activeSessionId == null ? <p>Waiting for race start</p> : null}
      <p>Race status: {raceState.status ?? 'idle'}</p>
    </section>
  )
}