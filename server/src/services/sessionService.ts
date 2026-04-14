import crypto from 'node:crypto'

import type { RaceState } from '@shared/race.js';
import type { RaceSession, Driver } from '@shared/session.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/errorCodes.js';

// =========================
// SESSION
// =========================
export function createSession(state: RaceState, label?: string): RaceSession {
  const finalLabel = label?.trim() || `Session ${state.sessions.length + 1}`

  console.log(`[SERVICE] Creating session "${finalLabel}"`)

  const session: RaceSession = {
    id: crypto.randomUUID(),
    label: finalLabel,
    drivers: [],
    status: 'upcoming',
  }

  state.sessions.push(session)

  // määrame upcoming ainult siis kui puudub
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
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
  }

  state.sessions.splice(index, 1)

  if (state.activeSessionId === sessionId) {
    state.activeSessionId = null
  }

  if (state.upcomingSessionId === sessionId) {
    const nextUpcoming = state.sessions.find((s) => s.status === 'upcoming') ?? null
    console.log(`[SERVICE] Reassigning upcomingSessionId → ${nextUpcoming?.id ?? 'null'}`)
    state.upcomingSessionId = nextUpcoming ? nextUpcoming.id : null
  }
}

// =========================
// DRIVER
// =========================
export function addDriver(state: RaceState, sessionId: string, name: string): Driver {
  console.log(`[SERVICE] Adding driver "${name}" to session ${sessionId}`)

  const session = getSession(state, sessionId)
  if (!session) {
    throw new AppError(ErrorCodes.SESSION_NOT_FOUND, 'Session not found')
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
    id: crypto.randomUUID(),
    name: normalizedName,
    carNumber,
  }

  console.log(`[SERVICE] Assigned carNumber=${carNumber} to "${normalizedName}"`)

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

  const index = session.drivers.findIndex((d) => d.id === driverId)
  if (index === -1) {
    throw new AppError(ErrorCodes.DRIVER_NOT_FOUND, 'Driver not found')
  }

  session.drivers.splice(index, 1)

  // 🔥 oluline: reindex car numbers
  session.drivers.forEach((d, i) => {
    d.carNumber = i + 1
  })
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