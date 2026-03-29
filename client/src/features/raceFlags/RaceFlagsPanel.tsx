import { useEffect, useState } from 'react'
import { appSocket } from '../../lib/socket'
import type { RaceState } from '@shared/race'

const modeColor: Record<string, string> = {
  safe: '#2b8a3e',
  hazard: '#f59e0b',
  danger: '#ef4444',
  finish: '#0ea5e9',
}

export function RaceFlagsPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setRaceState(state)

    appSocket.on('state:updated', onStateUpdated)
    appSocket.emit('state:get', (state) => setRaceState(state))

    return () => {
      appSocket.off('state:updated', onStateUpdated)
    }
  }, [])

  const mode = raceState?.mode ?? 'danger'

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
