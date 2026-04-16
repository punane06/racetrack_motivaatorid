import type { EmployeeRole } from './constants.js'
import type { LapData } from './lap.js'
import type { RaceMode, RaceState } from './race.js'
import type { RaceSession } from './session.js'

export interface AccessCheckPayload {
  role: EmployeeRole
  key: string
}

export interface AccessCheckResult {
  ok: boolean
  message?: string
}

export interface ClientToServerEvents {
    'driver:assign_car': (payload: { sessionId: string; driverId: string; carNumber: number }) => void
  'auth:check': (payload: AccessCheckPayload, callback: (result: AccessCheckResult) => void) => void
  'state:get': (callback: (state: RaceState) => void) => void
  'race:start': () => void
  'race-mode-change': (mode: RaceMode) => void
  'race-finished': () => void
  'race:end_session': () => void
  'lap-recorded': (carNumber: number) => void
  'session:create': (label: string, cb?: (sessions: RaceSession[]) => void) => void
  'session:delete': (sessionId: string, cb?: (sessions: RaceSession[]) => void) => void
  'driver:add': (payload: { sessionId: string; name: string }, cb?: (sessions: RaceSession[]) => void) => void
  'driver:edit': (payload: { sessionId: string; driverId: string; name: string }, cb?: (sessions: RaceSession[]) => void) => void
  'driver:remove': (payload: { sessionId: string; driverId: string }, cb?: (sessions: RaceSession[]) => void) => void
}

export interface ServerToClientEvents {
  'state:updated': (state: RaceState) => void
  'lap-recorded': (lapData: LapData[]) => void
  'race:tick': (timeRemainingSeconds: number) => void
  'race:mode': (mode: RaceMode) => void
  'race-finished': (state: RaceState) => void
  'next-session-updated': (state: RaceState) => void
  'sessions:updated': (sessions: RaceSession[]) => void
  'leaderboard:update': (leaderboard: unknown) => void
  'auth:required': () => void
  'operation:error': (message: string) => void
}
