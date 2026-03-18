import type { RaceSession } from '@shared/session'

import { DriverEditor } from './DriverEditor'
import { DriverList } from './DriverList'

interface SessionCardProps {
  session: RaceSession
  onDelete: (sessionId: string) => void
  onAddDriver: (sessionId: string, name: string) => void
  onEditDriver: (sessionId: string, driverId: string, name: string) => void
  onRemoveDriver: (sessionId: string, driverId: string) => void
}

export function SessionCard({
  session,
  onDelete,
  onAddDriver,
  onEditDriver,
  onRemoveDriver,
}: SessionCardProps) {
  return (
    <article className="session-card">
      <header className="session-header">
        <div>
          <h3>{session.label}</h3>
          <p className="muted">
            {session.drivers.length} driver{session.drivers.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="danger" onClick={() => onDelete(session.id)}>
          Delete Session
        </button>
      </header>

      <DriverEditor onSubmit={(name) => onAddDriver(session.id, name)} />

      <DriverList
        sessionId={session.id}
        drivers={session.drivers}
        onEdit={onEditDriver}
        onRemove={onRemoveDriver}
      />
    </article>
  )
}
