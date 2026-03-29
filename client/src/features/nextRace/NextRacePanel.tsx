import { useEffect, useState } from 'react'
import { appSocket } from '../../lib/socket'
import type { RaceState } from '@shared/race'

export function NextRacePanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setRaceState(state)

    appSocket.on('state:updated', onStateUpdated)
    appSocket.emit('state:get', (state) => setRaceState(state))

    return () => {
      appSocket.off('state:updated', onStateUpdated)
    }
  }, [])

  const next = raceState?.sessions.find((session) => session.id === raceState.upcomingSessionId)

  return (
    <section className="panel">
      <h2>Next Race</h2>
      {next ? (
        <div>
          <h3>{next.label}</h3>
          <p>Drivers:</p>
          <ul>
            {next.drivers.map((driver) => (
              <li key={driver.id}>Car {driver.carNumber} - {driver.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No upcoming session selected.</p>
      )}
    </section>
  )
}
