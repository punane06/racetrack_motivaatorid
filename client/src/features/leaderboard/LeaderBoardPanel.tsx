import { useEffect, useState } from 'react'
import { appSocket } from '../../lib/socket'
import type { RaceSession } from '@shared/session'

export function LeaderBoardPanel() {
  const [sessions, setSessions] = useState<RaceSession[]>([])

  useEffect(() => {
    const onSessionsUpdated = (updatedSessions: RaceSession[]) => {
      setSessions(updatedSessions)
    }

    appSocket.on('sessions:updated', onSessionsUpdated)

    appSocket.emit('state:get', (state) => {
      setSessions(state.sessions)
    })

    return () => {
      appSocket.off('sessions:updated', onSessionsUpdated)
    }
  }, [])

  return (
    <section className="panel">
      <h2>Leader Board</h2>
      <p>Real-time race ranking, fastest lap, current lap and timer will appear here.</p>

      {sessions.length === 0 ? (
        <p>No sessions yet.</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className="leaderboard-session">
            <h3>{session.label}</h3>
            <p>Status: {session.status}</p>
            <ul>
              {session.drivers.map((driver) => (
                <li key={driver.id}>
                  Car {driver.carNumber}: {driver.name}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
