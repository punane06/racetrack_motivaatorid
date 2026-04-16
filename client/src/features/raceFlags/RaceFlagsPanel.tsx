import { useEffect, useState } from 'react'
import type { RaceMode, RaceState } from '@shared/race'
import { publicSocket } from '@/lib/socket'

// Main color palette as fallback
const modeColor: Record<string, string> = {
  safe: '#2b8a3e',
  hazard: '#f59e0b',
  danger: '#ef4444',
  finish: '#0ea5e9',
}

// From PR: helper functions
function modeLabel(mode: RaceMode): string {
  switch (mode) {
    case 'safe': return 'GREEN FLAG'
    case 'hazard': return 'YELLOW FLAG'
    case 'danger': return 'RED FLAG'
    case 'finish': return 'CHEQUERED FLAG'
    default: return mode
  }
}
function modeClass(mode: RaceMode): string {
  switch (mode) {
    case 'safe': return 'flag-safe'
    case 'hazard': return 'flag-hazard'
    case 'danger': return 'flag-danger'
    case 'finish': return 'flag-finish'
    default: return 'flag-danger'
  }
}

export function RaceFlagsPanel() {
  // Main logic: raceState
  const [raceState, setRaceState] = useState<RaceState | null>(null)
  // From PR: mode and fullscreen
  const [mode, setMode] = useState<RaceMode>('danger')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // Main event
    const onStateUpdated = (state: RaceState) => {
      setRaceState(state)
      setMode(state.mode)
    }
    publicSocket.on('state:updated', onStateUpdated)
    publicSocket.emit('state:get', (state) => {
      setRaceState(state)
      setMode(state.mode)
    })
    // From PR: fullscreen
    const fetchState = () => {
      publicSocket.emit('state:get', (state: RaceState) => setMode(state.mode))
    }
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    publicSocket.on('connect', fetchState)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    if (publicSocket.connected) fetchState()
    return () => {
      publicSocket.off('state:updated', onStateUpdated)
      publicSocket.off('connect', fetchState)
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

  // Main fallback: if raceState is missing
  if (!raceState) {
    return (
      <section className="panel" style={{ textAlign: 'center' }}>
        <h2>Race Flags</h2>
        <div style={{ margin: '1rem 0', padding: '1rem', background: modeColor[mode], color: '#fff' }}>
          <strong>{mode.toUpperCase()}</strong>
        </div>
        <p>This flag state is taken from real-time race status.</p>
      </section>
    )
  }

  // From PR: detailed view
  return (
    <section className={`panel race-flags-panel ${modeClass(mode)}`}>
      <header className="race-flags-header">
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
        >
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>
      <div className="race-flag-label">{modeLabel(mode)}</div>
    </section>
  )
}