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

const STATUS_BADGE: Record<RaceSession['status'], { label: string; color: string }> = {
  upcoming: { label: 'upcoming', color: '#2563eb' }, // blue
  active: { label: 'active', color: '#22c55e' }, // green
  finished: { label: 'finished', color: '#64748b' }, // gray
}

export function SessionCard({
  session,
  onDelete,
  onAddDriver,
  onEditDriver,
  onRemoveDriver,
}: Readonly<SessionCardProps>) {
  const isUpcoming = session.status === 'upcoming';
  // Only show controls if session is upcoming
  return (
    <article className="session-card">
      <header className="session-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3>{session.label}</h3>
          <p className="muted">
            {session.drivers.length} driver{session.drivers.length === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.2em 0.7em',
              borderRadius: 12,
              fontSize: '0.95em',
              fontWeight: 600,
              background: STATUS_BADGE[session.status].color,
              color: '#fff',
              textTransform: 'capitalize',
            }}
          >
            {STATUS_BADGE[session.status].label}
          </span>
          {isUpcoming && (
            <button type="button" className="danger" onClick={() => onDelete(session.id)}>
              Delete Session
            </button>
          )}
        </div>
      </header>

      {isUpcoming && <DriverEditor onSubmit={(name) => onAddDriver(session.id, name)} />}

      <DriverList
        sessionId={session.id}
        drivers={session.drivers}
        onEdit={isUpcoming ? onEditDriver : undefined}
        onRemove={isUpcoming ? onRemoveDriver : undefined}
        sessionStatus={session.status}
      />
    </article>
  );
}
