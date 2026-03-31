import { useEffect, useState } from 'react'

import type { RaceMode, RaceState } from '@shared/race'
import { appSocket } from '@/lib/socket'

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

function modeClass(mode: RaceMode): string {
  switch (mode) {
    case 'safe':
      return 'flag-safe'
    case 'hazard':
      return 'flag-hazard'
    case 'danger':
      return 'flag-danger'
    case 'finish':
      return 'flag-finish'
    default:
      return 'flag-danger'
  }
}

export function RaceFlagsPanel() {
  const [mode, setMode] = useState<RaceMode>('danger')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setMode(state.mode)

    const fetchState = () => {
      appSocket.emit('state:get', (state: RaceState) => setMode(state.mode))
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

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      return
    }
    await document.exitFullscreen()
  }

  return (
    <section className={`panel race-flags-panel ${modeClass(mode)}`}>
      <header className="race-flags-header">
        <button type="button" onClick={toggleFullscreen}>
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>
      <div className="race-flag-label">{modeLabel(mode)}</div>
    </section>
  )
}
