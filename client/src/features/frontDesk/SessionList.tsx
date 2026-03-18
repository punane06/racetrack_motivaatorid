import type { RaceSession } from '@shared/session'

import { SessionCard } from './SessionCard'

interface SessionListProps {
  sessions: RaceSession[]
  onDelete: (sessionId: string) => void
  onAddDriver: (sessionId: string, name: string) => void
  onEditDriver: (sessionId: string, driverId: string, name: string) => void
  onRemoveDriver: (sessionId: string, driverId: string) => void
}

export function SessionList({
  sessions,
  onDelete,
  onAddDriver,
  onEditDriver,
  onRemoveDriver,
}: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="muted">No sessions yet. Create your first session.</p>
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onDelete={onDelete}
          onAddDriver={onAddDriver}
          onEditDriver={onEditDriver}
          onRemoveDriver={onRemoveDriver}
        />
      ))}
    </div>
  )
}
