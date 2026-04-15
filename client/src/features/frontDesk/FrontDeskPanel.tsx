import { useEffect, useState } from 'react'


import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { appSocket } from '@/lib/socket'
import { SessionList } from './SessionList'

export function FrontDeskPanel() {
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onSessionsUpdated = (nextSessions: RaceSession[]) => {
      setSessions(nextSessions)
    }

    const onOperationError = (message: string) => {
      setError(message)
    }

    const fetchState = () => {
      appSocket.emit('state:get', (state: RaceState) => {
        setSessions(state.sessions)
      })
    }

    appSocket.on('connect', fetchState)
    appSocket.on('sessions:updated', onSessionsUpdated)
    appSocket.on('operation:error', onOperationError)

    if (appSocket.connected) {
      fetchState()
    }

    return () => {
      appSocket.off('connect', fetchState)
      appSocket.off('sessions:updated', onSessionsUpdated)
      appSocket.off('operation:error', onOperationError)
    }
  }, [])

  const createSession = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = label.trim()
    if (!normalized) {
      return
    }

    setError(null)
    appSocket.emit('session:create', normalized)
    setLabel('')
  }

  const deleteSession = (sessionId: string) => {
    setError(null)
    appSocket.emit('session:delete', sessionId)
  }

  const addDriver = (sessionId: string, name: string) => {
    setError(null)
    appSocket.emit('driver:add', { sessionId, name })
  }

  const editDriver = (sessionId: string, driverId: string, name: string) => {
    setError(null)
    appSocket.emit('driver:edit', { sessionId, driverId, name })
  }

  const removeDriver = (sessionId: string, driverId: string) => {
    setError(null)
    appSocket.emit('driver:remove', { sessionId, driverId })
  }


  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const activeSessions = sessions.filter(s => s.status === 'active');
  const finishedSessions = sessions.filter(s => s.status === 'finished');

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

      {error ? <p className="error-message">{error}</p> : null}

      {upcomingSessions.length > 0 && <>
        <h3>Upcoming Sessions</h3>
        <SessionList
          sessions={upcomingSessions}
          onDelete={deleteSession}
          onAddDriver={addDriver}
          onEditDriver={editDriver}
          onRemoveDriver={removeDriver}
        />
      </>}

      {activeSessions.length > 0 && <>
        <h3>Active Sessions</h3>
        <SessionList
          sessions={activeSessions}
          onDelete={() => {}}
          onAddDriver={() => {}}
          onEditDriver={() => {}}
          onRemoveDriver={() => {}}
        />
      </>}

      {finishedSessions.length > 0 && <>
        <h3>Finished Sessions</h3>
        <SessionList
          sessions={finishedSessions}
          onDelete={() => {}}
          onAddDriver={() => {}}
          onEditDriver={() => {}}
          onRemoveDriver={() => {}}
        />
      </>}
    </section>
  );
}
