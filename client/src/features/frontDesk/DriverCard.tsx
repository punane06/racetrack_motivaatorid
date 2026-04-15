import { useState } from 'react'
import type { DragEvent } from 'react'
import type { Driver } from '@shared/session'
import { appSocket } from '@/lib/socket'
import { DriverEditor } from './DriverEditor'
import { getCarColor } from '@/lib/carColors'

interface DriverCardProps {
  readonly sessionId: string
  readonly driver: Driver
  readonly onEdit?: (sessionId: string, driverId: string, name: string) => void
  readonly onRemove?: (sessionId: string, driverId: string) => void
  readonly sessionStatus?: string
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

interface DragDriverPayload {
  sessionId: string
  id: string
  name: string
}

export function DriverCard({ sessionId, driver, onEdit, onRemove, sessionStatus, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: Readonly<DriverCardProps>) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragOverName, setIsDragOverName] = useState(false)
  const isUpcoming = sessionStatus === 'upcoming'

  // Car selection logic (Prompt 11)
  // Only allow car selection for upcoming sessions
  // Find available car numbers (1-8 not assigned to other drivers, plus current)
  const [carSelectError, setCarSelectError] = useState<string | null>(null)
  const carNumbers = Array.from({ length: 8 }, (_, i) => i + 1)

  // (removed unused takenCars)

  const onNameDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (!isUpcoming || !onEdit) return
    event.dataTransfer.effectAllowed = 'copyMove'
    const payload: DragDriverPayload = { sessionId, id: driver.id, name: driver.name }
    event.dataTransfer.setData('application/x-driver-payload', JSON.stringify(payload))
    event.dataTransfer.setData('application/x-driver-name', driver.name)
    event.dataTransfer.setData('text/plain', driver.name)
  }

  const onNameDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (!isUpcoming || !onEdit) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragOverName(true)
  }

  const onNameDragLeave = () => {
    setIsDragOverName(false)
  }

  const onNameDrop = (event: DragEvent<HTMLButtonElement>) => {
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

    if (source?.id && source.id !== driver.id) {
      const targetName = driver.name
      const tempName = `__swap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`
      const sourceSessionId = source.sessionId || sessionId

      onEdit?.(sourceSessionId, source.id, tempName)
      onEdit?.(sessionId, driver.id, source.name)
      onEdit?.(sourceSessionId, source.id, targetName)
      return
    }

    onEdit?.(sessionId, driver.id, normalizedName)
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

  return (
    <li className="driver-card">
      <div className="driver-main">
        <span
          className="car-badge"
          style={{ backgroundColor: getCarColor(driver.carNumber) }}
        >
          🚗 Car {driver.carNumber}
        </span>
        <button
          type="button"
          className="driver-name"
          draggable={isUpcoming && !!onEdit}
          onDragStart={onNameDragStart}
          onDragOver={onNameDragOver}
          onDragLeave={onNameDragLeave}
          onDrop={onNameDrop}
          style={{ background: isDragOverName ? '#e0e7ef' : undefined }}
          aria-label={`Driver name: ${driver.name}`}
          disabled={!isUpcoming || !onEdit}
          onClick={() => {
            if (isUpcoming && onEdit) setIsEditing(true)
          }}
        >
          {driver.name}
        </button>
        {/* Car select dropdown for upcoming session */}
        {isUpcoming && (
          <select
            value={driver.carNumber}
            style={{ marginLeft: 12 }}
            onChange={e => {
              const newCar = Number(e.target.value)
              setCarSelectError(null)
              appSocket.emit('driver:assign_car', {
                sessionId,
                driverId: driver.id,
                carNumber: newCar,
              })
            }}
            aria-label="Assign car number"
          >
            {carNumbers.map(num => (
              <option key={num} value={num}>
                Car {num}
              </option>
            ))}
          </select>
        )}
      </div>
      {carSelectError && <div style={{ color: 'red' }}>{carSelectError}</div>}
      {isUpcoming && (
        <div className="driver-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onMoveUp && canMoveUp && (
            <button
              type="button"
              aria-label="Move driver up"
              onClick={onMoveUp}
              tabIndex={0}
            >↑</button>
          )}
          {onMoveDown && canMoveDown && (
            <button
              type="button"
              aria-label="Move driver down"
              onClick={onMoveDown}
              tabIndex={0}
            >↓</button>
          )}
          {onEdit && <button onClick={() => setIsEditing(true)}>Edit</button>}
          {onRemove && (
            <button className="danger" onClick={() => onRemove(sessionId, driver.id)}>
              Remove
            </button>
          )}
        </div>
      )}
    </li>
  )
}