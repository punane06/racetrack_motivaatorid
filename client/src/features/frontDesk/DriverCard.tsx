import { useState } from 'react'
import type { DragEvent } from 'react'

import type { Driver } from '@shared/session'
import { DriverEditor } from './DriverEditor'
import { getCarColor } from '@/lib/carColors'

interface DriverCardProps {
  sessionId: string
  driver: Driver
  onEdit: (sessionId: string, driverId: string, name: string) => void
  onRemove: (sessionId: string, driverId: string) => void
}

interface DragDriverPayload {
  sessionId: string
  id: string
  name: string
}

export function DriverCard({ sessionId, driver, onEdit, onRemove }: DriverCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragOverName, setIsDragOverName] = useState(false)

  const onNameDragStart = (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = 'copyMove'
    const payload: DragDriverPayload = { sessionId, id: driver.id, name: driver.name }
    event.dataTransfer.setData('application/x-driver-payload', JSON.stringify(payload))
    event.dataTransfer.setData('application/x-driver-name', driver.name)
    event.dataTransfer.setData('text/plain', driver.name)
  }

  const onNameDragOver = (event: DragEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragOverName(true)
  }

  const onNameDragLeave = () => {
    setIsDragOverName(false)
  }

  const onNameDrop = (event: DragEvent<HTMLSpanElement>) => {
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
        <span
          draggable
          onDragStart={onNameDragStart}
          onDragOver={onNameDragOver}
          onDragLeave={onNameDragLeave}
          onDrop={onNameDrop}
          title="Drag this name onto another driver name"
          style={{
            padding: '0.2rem 0.4rem',
            borderRadius: '0.35rem',
            cursor: 'grab',
            backgroundColor: isDragOverName ? '#e2e8f0' : 'transparent',
            transition: 'background-color 150ms ease',
          }}
        >
          {driver.name}
        </span>
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
