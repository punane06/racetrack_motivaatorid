
import { useEffect, useState } from 'react'
import { useToast } from '@/lib/toast'


import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'
import { SessionList } from './SessionList'

export function FrontDeskPanel() {
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [label, setLabel] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    const onSessionsUpdated = (nextSessions: RaceSession[]) => {
      setSessions(nextSessions)
    }

    const onOperationError = (message: string) => {
      showToast(message, 'error')
    }

    const fetchState = () => {
      appSocket.emit('state:get', (state: RaceState) => {
        setSessions(state.sessions)
      })
    }

    appSocket.on('connect', fetchState)
    appSocket.on('sessions:updated', onSessionsUpdated)
    appSocket.on('state:updated', (state: RaceState) => setSessions(state.sessions))
    appSocket.on('operation:error', onOperationError)

    if (appSocket.connected) {
      fetchState()
    }

    return () => {
      appSocket.off('connect', fetchState)
      appSocket.off('sessions:updated', onSessionsUpdated)
      appSocket.off('state:updated', (state: RaceState) => setSessions(state.sessions))
      appSocket.off('operation:error', onOperationError)
    }
  }, [])

  const createSession = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = label.trim()
    if (!normalized) {
      return
    }

    appSocket.emit('session:create', normalized)
    setLabel('')
  }

  const deleteSession = (sessionId: string) => {
    appSocket.emit('session:delete', sessionId)
  }

  const addDriver = (sessionId: string, name: string) => {
    appSocket.emit('driver:add', { sessionId, name })
  }

  const editDriver = (sessionId: string, driverId: string, name: string) => {
    appSocket.emit('driver:edit', { sessionId, driverId, name })
  }

  const removeDriver = (sessionId: string, driverId: string) => {
    appSocket.emit('driver:remove', { sessionId, driverId })
  }



  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');

  return (
    <section className="panel">
      <div className="front-desk-header">
        <h2>Front Desk</h2>
        <p className="muted">Create sessions and manage drivers with automatic car assignment.</p>
      </div>

      <form className="session-create-form" onSubmit={createSession}>
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Session name (e.g. Session 1)"
          aria-label="Session name"
        />
        <button type="submit">Add Session</button>
      </form>

      {upcomingSessions.length > 0 ? (
        <>
          <h3>Upcoming Sessions</h3>
          <SessionList
            sessions={upcomingSessions}
            onDelete={deleteSession}
            onAddDriver={addDriver}
            onEditDriver={editDriver}
            onRemoveDriver={removeDriver}
          />
        </>
      ) : (
        <p className="muted">No upcoming sessions. Add a new session to get started.</p>
      )}
    </section>
  );
}
