import { useEffect, useState } from 'react'
import { appSocket } from '../../lib/socket'
import type { RaceState, RaceMode } from '@shared/race'

export function RaceControlPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setRaceState(state)

    appSocket.on('state:updated', onStateUpdated)
    appSocket.emit('state:get', (state) => setRaceState(state))

    return () => {
      appSocket.off('state:updated', onStateUpdated)
    }
  }, [])

  const startRace = () => {
    appSocket.emit('race:start')
  }

  const finishRace = () => {
    appSocket.emit('race-finished')
  }

  const endSession = () => {
    appSocket.emit('race:end_session')
  }

  const changeMode = (mode: RaceMode) => {
    appSocket.emit('race-mode-change', mode)
  }

  return (
    <section className="panel">
      <h2>Race Control</h2>
      <p>Start race, mode controls and end session actions.</p>
      <p>Current status: {raceState?.status ?? 'idle'}</p>
      <p>Race mode: {raceState?.mode ?? 'danger'}</p>
      <button onClick={startRace}>Start Race</button>
      <button onClick={finishRace}>Finish Race</button>
      <button onClick={endSession}>End Session</button>
      <div style={{ marginTop: '0.75rem' }}>
        Mode:
        {(['safe', 'hazard', 'danger', 'finish'] as RaceMode[]).map((mode) => (
          <button key={mode} style={{ marginLeft: '0.5rem' }} onClick={() => changeMode(mode)}>
            {mode}
          </button>
        ))}
      </div>
    </section>
  )
}
