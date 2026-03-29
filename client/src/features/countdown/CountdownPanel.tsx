import { useEffect, useState } from 'react'
import { appSocket } from '../../lib/socket'
import type { RaceState } from '@shared/race'

export function CountdownPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => {
      setRaceState(state)
    }

    appSocket.on('state:updated', onStateUpdated)
    appSocket.on('race:tick', (remainingSeconds) => {
      setRaceState((prev) => (prev ? { ...prev, timeRemainingSeconds: remainingSeconds } : prev))
    })

    appSocket.emit('state:get', (state) => {
      setRaceState(state)
    })

    return () => {
      appSocket.off('state:updated', onStateUpdated)
      appSocket.off('race:tick')
    }
  }, [])

  const remaining = raceState?.timeRemainingSeconds ?? 0

  return (
    <section className="panel">
      <h2>Race Countdown</h2>
      <p>Remaining time: {remaining}s</p>
      <p>Race status: {raceState?.status ?? 'idle'}</p>
    </section>
  )
}
