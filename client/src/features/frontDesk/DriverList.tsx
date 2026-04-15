import { appSocket } from '@/lib/socket'
import type { Driver } from '@shared/session'

import { DriverCard } from './DriverCard'

interface DriverListProps {
  sessionId: string
  drivers: Driver[]
  onEdit?: (sessionId: string, driverId: string, name: string) => void
  onRemove?: (sessionId: string, driverId: string) => void
  sessionStatus?: string
}

export function DriverList({ sessionId, drivers, onEdit, onRemove, sessionStatus }: Readonly<DriverListProps>) {
  if (drivers.length === 0) {
    return <p className="muted">No drivers added yet.</p>
  }

  // Sort drivers by carNumber for consistent order
  const sortedDrivers = drivers.slice().sort((a, b) => a.carNumber - b.carNumber)

  // Move driver up/down handler
  const moveDriver = (driverId: string, direction: 'up' | 'down') => {
    const idx = sortedDrivers.findIndex(d => d.id === driverId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedDrivers.length) return
    const driver = sortedDrivers[idx]
    const swapDriver = sortedDrivers[swapIdx]
    // Swap car numbers
    appSocket.emit('driver:assign_car', {
      sessionId,
      driverId: driver.id,
      carNumber: swapDriver.carNumber,
    })
    appSocket.emit('driver:assign_car', {
      sessionId,
      driverId: swapDriver.id,
      carNumber: driver.carNumber,
    })
  }

  return (
    <ul className="driver-list">
      {sortedDrivers.map((driver, idx) => (
        <DriverCard
          key={driver.id}
          sessionId={sessionId}
          driver={driver}
          onEdit={onEdit}
          onRemove={onRemove}
          sessionStatus={sessionStatus}
          canMoveUp={sessionStatus === 'upcoming' && idx > 0}
          canMoveDown={sessionStatus === 'upcoming' && idx < sortedDrivers.length - 1}
          onMoveUp={() => moveDriver(driver.id, 'up')}
          onMoveDown={() => moveDriver(driver.id, 'down')}
        />
      ))}
    </ul>
  )
}
