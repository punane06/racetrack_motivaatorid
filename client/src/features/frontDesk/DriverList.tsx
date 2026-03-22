import type { Driver } from '@shared/session'

import { DriverCard } from './DriverCard'

interface DriverListProps {
  sessionId: string
  drivers: Driver[]
  onEdit: (sessionId: string, driverId: string, name: string) => void
  onRemove: (sessionId: string, driverId: string) => void
}

export function DriverList({ sessionId, drivers, onEdit, onRemove }: DriverListProps) {
  if (drivers.length === 0) {
    return <p className="muted">No drivers added yet.</p>
  }

  return (
    <ul className="driver-list">
      {drivers
        .slice()
        .sort((a, b) => a.carNumber - b.carNumber)
        .map((driver) => (
          <DriverCard
            key={driver.id}
            sessionId={sessionId}
            driver={driver}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
    </ul>
  )
}
