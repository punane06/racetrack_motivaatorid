import type { RaceSession } from './session.js'

export type RaceMode = 'safe' | 'hazard' | 'danger' | 'finish'
export type RaceStatus = 'idle' | 'running' | 'finished'

export interface RaceState {
  status: RaceStatus
  mode: RaceMode
  activeSessionId: string | null
  upcomingSessionId: string | null
  sessions: RaceSession[]
  timeRemainingSeconds: number
  startedAt: number | null
}
