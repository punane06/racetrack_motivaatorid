import type { RaceState } from '@shared/race'
import type { RaceSession, Driver } from '@shared/session'

export function createSession(state: RaceState, label: string): RaceSession {
  const session: RaceSession = {
    id: crypto.randomUUID(),
    label,
    drivers: [],
    status: 'upcoming',
  }

  state.sessions.push(session)

  // If there is no upcoming session marked yet, set this as upcoming
  if (!state.upcomingSessionId) {
    state.upcomingSessionId = session.id
  }

  return session
}

export function deleteSession(state: RaceState, sessionId: string): void {
  const index = state.sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) {
    throw new Error('Session not found')
  }

  state.sessions.splice(index, 1)

  if (state.activeSessionId === sessionId) {
    state.activeSessionId = null
  }
  if (state.upcomingSessionId === sessionId) {
    state.upcomingSessionId = null
  }
}

export function addDriver(state: RaceState, sessionId: string, name: string): Driver {
  const session = getSession(state, sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('Driver name is required')
  }

  const existing = session.drivers.find(
    (driver) => driver.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    throw new Error('Driver name must be unique in the session')
  }

  const usedCarNumbers = new Set(session.drivers.map((driver) => driver.carNumber))
  const availableCarNumber = findAvailableCar(usedCarNumbers)
  if (!availableCarNumber) {
    throw new Error('All car numbers are already assigned (max 8)')
  }

  const driver: Driver = {
    id: crypto.randomUUID(),
    name: normalizedName,
    carNumber: availableCarNumber,
  }

  session.drivers.push(driver)
  return driver
}

export function editDriver(
  state: RaceState,
  sessionId: string,
  driverId: string,
  name: string,
): Driver {
  const session = getSession(state, sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('Driver name is required')
  }

  const driver = session.drivers.find((d) => d.id === driverId)
  if (!driver) {
    throw new Error('Driver not found')
  }

  const existing = session.drivers.find(
    (d) => d.id !== driverId && d.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    throw new Error('Driver name must be unique in the session')
  }

  driver.name = normalizedName
  return driver
}

export function removeDriver(state: RaceState, sessionId: string, driverId: string): void {
  const session = getSession(state, sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const driverIndex = session.drivers.findIndex((d) => d.id === driverId)
  if (driverIndex === -1) {
    throw new Error('Driver not found')
  }

  session.drivers.splice(driverIndex, 1)
}

function getSession(state: RaceState, sessionId: string): RaceSession | undefined {
  return state.sessions.find((s) => s.id === sessionId)
}

function findAvailableCar(used: Set<number>): number | null {
  for (let i = 1; i <= 8; i += 1) {
    if (!used.has(i)) {
      return i
    }
  }
  return null
}
