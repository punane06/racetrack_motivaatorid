import crypto from 'node:crypto'

import type { RaceState } from 'shared/race.js'
import type { Driver, RaceSession } from 'shared/session.js'
import { AppError } from '../errors/AppError.js'
import { ErrorCodes } from '../errors/errorCodes.js'

// =========================
// SESSION
// =========================
export function createSession(state: RaceState, label?: string): RaceSession {
  const finalLabel = label?.trim() || `Session ${state.sessions.length + 1}`

  // [SERVICE] Creating session "${finalLabel}" (dev only)

  const session: RaceSession = {
    /**
     * Generate a cryptographically strong random UUID (RFC 4122 v4).
     * @type {string}
     */
    id: crypto.randomUUID(),
    label: finalLabel,
    drivers: [],
    status: 'upcoming',
  }

  state.sessions.push(session)

  // määrame upcoming ainult siis kui puudub
  if (!state.upcomingSessionId) {
    // [SERVICE] Setting upcomingSessionId → ${session.id} (dev only)
    state.upcomingSessionId = session.id
  }

  return session
}

export function deleteSession(state: RaceState, sessionId: string): void {
  // [SERVICE] Deleting session ${sessionId} (dev only)

  const index = state.sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  const session = state.sessions[index]
  if (session.status !== 'upcoming') {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Cannot delete session unless it is upcoming')
  }
  state.sessions.splice(index, 1)

  if (state.activeSessionId === sessionId) {
    state.activeSessionId = null
  }

  if (state.upcomingSessionId === sessionId) {
    const nextUpcoming = state.sessions.find((s) => s.status === 'upcoming') ?? null
    // [SERVICE] Reassigning upcomingSessionId → ${nextUpcoming?.id ?? 'null'} (dev only)
    state.upcomingSessionId = nextUpcoming ? nextUpcoming.id : null
  }
}

// =========================
// DRIVER
// =========================
export function addDriver(state: RaceState, sessionId: string, name: string): Driver {
  // [SERVICE] Adding driver "${name}" to session ${sessionId} (dev only)

  const session = getSession(state, sessionId)
  if (!session) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  if (session.status !== 'upcoming') {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Cannot add driver unless session is upcoming')
  }
  if (session.drivers.length >= 8) {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Maximum 8 drivers per session is reached')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Driver name is required')
  }

  const existing = session.drivers.find(
    (d) => d.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    throw new AppError(ErrorCodes.DRIVER_ALREADY_EXISTS, 'Driver name must be unique')
  }

  const usedCarNumbers = new Set(session.drivers.map((d) => d.carNumber))
  const carNumber = findAvailableCar(usedCarNumbers)

  if (!carNumber) {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'No available cars')
  }

  const driver: Driver = {
    /**
     * Generate a cryptographically strong random UUID (RFC 4122 v4).
     * @type {string}
     */
    id: crypto.randomUUID(),
    name: normalizedName,
    carNumber,
  }

  // [SERVICE] Assigned carNumber=${carNumber} to "${normalizedName}" (dev only)

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
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Driver name is required')
  }

  if (session.status !== 'upcoming') {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Cannot edit driver unless session is upcoming')
  }
  const driver = session.drivers.find((d) => d.id === driverId)
  if (!driver) {
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  const existing = session.drivers.find(
    (d) => d.id !== driverId && d.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existing) {
    throw new AppError(ErrorCodes.DRIVER_ALREADY_EXISTS, 'Driver name must be unique')
  }

  driver.name = normalizedName

  return driver
}

export function removeDriver(state: RaceState, sessionId: string, driverId: string): void {
  const session = getSession(state, sessionId)
  if (!session) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  if (session.status !== 'upcoming') {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Cannot remove driver unless session is upcoming')
  }
  const index = session.drivers.findIndex((d) => d.id === driverId)
  if (index === -1) {
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  session.drivers.splice(index, 1)
  // Do not reindex car numbers! Freed car numbers will be reused by addDriver via findAvailableCar.
}

export function assignCarToDriver(
  state: RaceState,
  sessionId: string,
  driverId: string,
  carNumber: number,
): void {
  if (carNumber < 1 || carNumber > 8) {
    throw new AppError(ErrorCodes.INVALID_PAYLOAD, 'Car number must be between 1 and 8')
  }
  const session = getSession(state, sessionId)
  if (!session) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }
  if (session.status !== 'upcoming') {
    throw new AppError(
      ErrorCodes.INVALID_PAYLOAD,
      'Cannot edit drivers or assign cars unless session is upcoming',
    )
  }

  const driver = session.drivers.find((d) => d.id === driverId)
  if (!driver) {
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  // If car number is the same, do nothing
  if (driver.carNumber === carNumber) return

  // Swap car numbers if the target car is already taken in this session
  const otherDriver = session.drivers.find((d) => d.carNumber === carNumber && d.id !== driverId)
  if (otherDriver) {
    otherDriver.carNumber = driver.carNumber
  }
  driver.carNumber = carNumber
}

// =========================
// HELPERS
// =========================
function getSession(state: RaceState, sessionId: string): RaceSession | undefined {
  return state.sessions.find((s) => s.id === sessionId)
}

function findAvailableCar(used: Set<number>): number | null {
  for (let i = 1; i <= 8; i++) {
    if (!used.has(i)) return i
  }
  return null
}