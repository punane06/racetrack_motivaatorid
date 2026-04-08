import { useState } from 'react'
import type { DragEvent } from 'react'
import type { Driver } from '@shared/session'
import { DriverEditor } from './DriverEditor'
import { getCarColor } from '@/lib/carColors'

interface DriverCardProps {
  sessionId: string
  driver: Driver
  onEdit?: (sessionId: string, driverId: string, name: string) => void
  onRemove?: (sessionId: string, driverId: string) => void
  sessionStatus?: string
}

interface DragDriverPayload {
  sessionId: string
  id: string
  name: string
}

export function DriverCard({ sessionId, driver, onEdit, onRemove, sessionStatus }: DriverCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragOverName, setIsDragOverName] = useState(false)
  const isUpcoming = sessionStatus === 'upcoming'

  const onNameDragStart = (event: DragEvent<HTMLSpanElement>) => {
    if (!isUpcoming || !onEdit) return
    event.dataTransfer.effectAllowed = 'copyMove'
    const payload: DragDriverPayload = { sessionId, id: driver.id, name: driver.name }
    event.dataTransfer.setData('application/x-driver-payload', JSON.stringify(payload))
    event.dataTransfer.setData('application/x-driver-name', driver.name)
    event.dataTransfer.setData('text/plain', driver.name)
  }

  const onNameDragOver = (event: DragEvent<HTMLSpanElement>) => {
    if (!isUpcoming || !onEdit) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragOverName(true)
  }

  const onNameDragLeave = () => {
    setIsDragOverName(false)
  }

  const onNameDrop = (event: DragEvent<HTMLSpanElement>) => {
    if (!isUpcoming || !onEdit) return
    event.preventDefault()
    setIsDragOverName(false)

    const payloadRaw = event.dataTransfer.getData('application/x-driver-payload')
    let source: DragDriverPayload | null = null
    if (payloadRaw) {
      try {
        source = JSON.parse(payloadRaw) as DragDriverPayload
      } catch {
        source = null
      }
    }

    const droppedName =
      event.dataTransfer.getData('application/x-driver-name') || event.dataTransfer.getData('text/plain')
    const normalizedName = droppedName.trim()

    if (!normalizedName || normalizedName === driver.name) {
      return
    }

    if (source && source.id && source.id !== driver.id) {
      const targetName = driver.name
      const tempName = `__swap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`
      const sourceSessionId = source.sessionId || sessionId

      onEdit(sourceSessionId, source.id, tempName)
      onEdit(sessionId, driver.id, source.name)
      onEdit(sourceSessionId, source.id, targetName)
      return
    }

    onEdit(sessionId, driver.id, normalizedName)
  }

  if (isEditing && isUpcoming && onEdit) {
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
  }

  return (
    <li className="driver-card" style={{ background: getCarColor(driver.carNumber) }}>
      <span
        className="driver-name"
        draggable={isUpcoming && !!onEdit}
        onDragStart={onNameDragStart}
        onDragOver={onNameDragOver}
        onDragLeave={onNameDragLeave}
        onDrop={onNameDrop}
        style={{
          background: isDragOverName ? '#e0e7ef' : undefined,
        }}
      >
        {driver.name}
      </span>
      <span className="car-number">Car {driver.carNumber}</span>
      {isUpcoming && onEdit && onRemove ? (
        <div className="driver-actions">
          <button onClick={() => setIsEditing(true)}>Edit</button>
          <button className="danger" onClick={() => onRemove(sessionId, driver.id)}>
            Remove
          </button>
        </div>
      ) : null}
    </li>
  )
}
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
