
import { useEffect, useState } from 'react'
import { useToast } from '@/lib/toast'


import type { RaceState } from '@shared/race'
import type { RaceSession } from '@shared/dist/session'
import { employeeSocket } from '@/lib/socket'
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
      employeeSocket.emit('state:get', (state: RaceState) => {
        setSessions(state.sessions)
      })
    }

    employeeSocket.on('connect', fetchState)
    employeeSocket.on('sessions:updated', onSessionsUpdated)
    employeeSocket.on('state:updated', (state: RaceState) => setSessions(state.sessions))
    employeeSocket.on('operation:error', onOperationError)

    if (employeeSocket.connected) {
      fetchState()
    }

    return () => {
      employeeSocket.off('connect', fetchState)
      employeeSocket.off('sessions:updated', onSessionsUpdated)
      employeeSocket.off('state:updated', (state: RaceState) => setSessions(state.sessions))
      employeeSocket.off('operation:error', onOperationError)
    }
  }, [])

  const createSession = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = label.trim()
    if (!normalized) {
      return
    }

      employeeSocket.emit('session:create', normalized, (updatedSessions: RaceSession[]) => {
        setSessions(updatedSessions)
      })
    setLabel('')
  }

  const deleteSession = (sessionId: string) => {
     employeeSocket.emit('session:delete', sessionId, (updatedSessions: RaceSession[]) => {
      setSessions(updatedSessions)
     })
  }

  const addDriver = (sessionId: string, name: string) => {
     employeeSocket.emit('driver:add', { sessionId, name }, (updatedSessions: RaceSession[]) => {
      setSessions(updatedSessions)
     })
  }

  const editDriver = (sessionId: string, driverId: string, name: string) => {
     employeeSocket.emit('driver:edit', { sessionId, driverId, name }, (updatedSessions: RaceSession[]) => {
      setSessions(updatedSessions)
     })
  }

  const removeDriver = (sessionId: string, driverId: string) => {
     employeeSocket.emit('driver:remove', { sessionId, driverId }, (updatedSessions: RaceSession[]) => {
      setSessions(updatedSessions)
     })
  }



  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');

  return (
    <section className="panel">
      <div className="front-desk-header">
        <h2>Front Desk</h2>
        <p className="muted">Create sessions and manage drivers.</p>
      </div>

      <form className="session-create-form" onSubmit={createSession}>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Session name (e.g. Session 1)"
          aria-label="Session name"
        />
        <button type="submit">Add Session</button>
      </form>

      {upcomingSessions.length === 0 ? (
        <p className="muted">No upcoming sessions. Add a new session above.</p>
      ) : (
        <SessionList
          sessions={upcomingSessions}
          onDelete={deleteSession}
          onAddDriver={addDriver}
          onEditDriver={editDriver}
          onRemoveDriver={removeDriver}
        />
      )}
      
      {/* Lõpetatud sessioone EI kuvata vastavalt nõudele */}
    </section>
  )
}
