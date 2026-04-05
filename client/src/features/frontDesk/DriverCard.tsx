import { useState } from 'react'

import type { Driver } from '@shared/session'
import { DriverEditor } from './DriverEditor'
import { getCarColor } from '@/lib/carColors'

interface DriverCardProps {
  sessionId: string
  driver: Driver
  onEdit: (sessionId: string, driverId: string, name: string) => void
  onRemove: (sessionId: string, driverId: string) => void
}

export function DriverCard({ sessionId, driver, onEdit, onRemove }: DriverCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <li className="driver-card editing">
        <DriverEditor
          mode="edit"
          initialName={driver.name}
          submitLabel="Save"
          onSubmit={(name) => {
            onEdit(sessionId, driver.id, name)
            setIsEditing(false)
          }}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    )
  }

    return (
    <li className="driver-card">
      <div className="driver-main">
        <span
          className="car-badge"
          style={{ backgroundColor: getCarColor(driver.carNumber) }}
        >
          🚗 Car {driver.carNumber}
        </span>
        <span>{driver.name}</span>
      </div>

      <div className="driver-actions">
        <details className="actions-dropdown">
          <summary className="ghost">Actions ▾</summary>
          <div className="actions-menu">
            <button type="button" className="ghost" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={() => onRemove(sessionId, driver.id)}>
              Remove
            </button>
          </div>
        </details>
      </div>
    </li>
  )
}
