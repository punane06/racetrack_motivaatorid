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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between', minHeight: 40, maxWidth: '100%', width: '100%', marginBottom: 20 }}>
          {session.status === 'upcoming' ? (
            <span
              style={{
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '1.13em',
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                marginRight: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                textTransform: 'capitalize',
              }}
            >
              upcoming
            </span>
          ) : (
            <span
              style={{
                display: 'inline-block',
                padding: '0.2em 0.7em',
                borderRadius: 12,
                fontSize: '0.93em',
                fontWeight: 500,
                background: STATUS_BADGE[session.status].color,
                color: '#fff',
                textTransform: 'capitalize',
                boxShadow: 'none',
              }}
            >
              {STATUS_BADGE[session.status].label}
            </span>
          )}
          {isUpcoming && (
            <button type="button" className="danger" style={{minHeight: 40}} onClick={() => onDelete(session.id)}>
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
