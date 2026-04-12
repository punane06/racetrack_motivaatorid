import type { RaceState } from '@shared/race.js';
import type { RaceSession, Driver } from '@shared/session.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/errorCodes.js';

export function createSession(state: RaceState, label: string): RaceSession {
  console.log(`[SERVICE] Creating session "${label}"`)
  const session: RaceSession = {
    id: crypto.randomUUID(),
    label,
    drivers: [],
    status: 'upcoming',
  }

  state.sessions.push(session)

  // If there is no upcoming session marked yet, set this as upcoming
  if (!state.upcomingSessionId) {
    console.log(`[SERVICE] Setting upcomingSessionId → ${session.id}`)
    state.upcomingSessionId = session.id
  }

  return session
}

export function deleteSession(state: RaceState, sessionId: string): void {
  console.log(`[SERVICE] Deleting session ${sessionId}`)
  const index = state.sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) {
    console.warn(`[SERVICE] Session ${sessionId} not found`)
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  state.sessions.splice(index, 1)

  if (state.activeSessionId === sessionId) {
    console.log(`[SERVICE] Clearing activeSessionId`)
    state.activeSessionId = null
  }
  if (state.upcomingSessionId === sessionId) {
  const nextUpcoming = state.sessions.find((s) => s.status === 'upcoming') ?? null
  console.log(`[SERVICE] Reassigning upcomingSessionId → ${nextUpcoming?.id ?? 'null'}`)
  state.upcomingSessionId = nextUpcoming ? nextUpcoming.id : null
  } 
}

export function addDriver(state: RaceState, sessionId: string, name: string): Driver {
  console.log(`[SERVICE] Adding driver "${name}" to session ${sessionId}`)
  const session = getSession(state, sessionId)
  if (!session) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  if (session.drivers.length >= 8) {
    throw new Error('Maximum 8 drivers per session is reached')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    console.warn(`[SERVICE] Invalid driver name (empty)`)
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Driver name is required')
  }

  const existing = session.drivers.find(
    (driver: Driver) => driver.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    console.warn(`[SERVICE] Driver "${normalizedName}" already exists in session ${sessionId}`)
    throw new AppError(ErrorCodes.DRIVER_ALREADY_EXISTS, 'Driver name must be unique in the session')
  }

  const usedCarNumbers = new Set<number>(session.drivers.map((driver: Driver) => driver.carNumber))
  const availableCarNumber = findAvailableCar(usedCarNumbers)
  if (!availableCarNumber) {
    console.warn(`[SERVICE] No available car numbers left in session ${sessionId}`)
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'All car numbers are already assigned (max 8)')
  }

  const driver: Driver = {
    id: crypto.randomUUID(),
    name: normalizedName,
    carNumber: availableCarNumber,
  }
  console.log(`[SERVICE] Assigned carNumber=${availableCarNumber} to driver "${normalizedName}"`)

  session.drivers.push(driver)
  return driver
}

export function editDriver(
  state: RaceState,
  sessionId: string,
  driverId: string,
  name: string,
): Driver {
  console.log(`[SERVICE] Editing driver ${driverId} in session ${sessionId} → newName="${name}"`)
  const session = getSession(state, sessionId)
  if (!session) {
    console.warn(`[SERVICE] Session ${sessionId} not found`)
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    console.warn(`[SERVICE] Invalid driver name (empty)`)
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Driver name is required')
  }

  const driver = session.drivers.find((d: Driver) => d.id === driverId)
  if (!driver) {
    console.warn(`[SERVICE] Driver ${driverId} not found in session ${sessionId}`)
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  const existing = session.drivers.find(
    (d: Driver) => d.id !== driverId && d.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    console.warn(`[SERVICE] Driver name "${normalizedName}" already exists in session ${sessionId}`)
    throw new AppError(ErrorCodes.DRIVER_ALREADY_EXISTS, 'Driver name must be unique in the session')
  }

  driver.name = normalizedName
  return driver
}

export function removeDriver(state: RaceState, sessionId: string, driverId: string): void {
  console.log(`[SERVICE] Removing driver ${driverId} from session ${sessionId}`)
  const session = getSession(state, sessionId)
  if (!session) {
    console.warn(`[SERVICE] Session ${sessionId} not found`)
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  const driverIndex = session.drivers.findIndex((d: Driver) => d.id === driverId)
  if (driverIndex === -1) {
    console.warn(`[SERVICE] Driver ${driverId} not found in session ${sessionId}`)
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  session.drivers.splice(driverIndex, 1)
}

function getSession(state: RaceState, sessionId: string): RaceSession | undefined {
  return state.sessions.find((s: RaceSession) => s.id === sessionId)
}

function findAvailableCar(used: Set<number>): number | null {
  for (let i = 1; i <= 8; i += 1) {
    if (!used.has(i)) {
      return i
    }
  }
  return null
}
