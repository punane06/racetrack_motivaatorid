import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

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

  const createSession = (event: FormEvent<HTMLFormElement>) => {
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

      <SessionList
        sessions={sessions}
        onDelete={deleteSession}
        onAddDriver={addDriver}
        onEditDriver={editDriver}
        onRemoveDriver={removeDriver}
      />
    </section>
  )
}
