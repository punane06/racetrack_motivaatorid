import type { LapData } from './lap.js'
import type { RaceSession } from './session.js'

export type RaceMode = 'safe' | 'hazard' | 'danger' | 'finish'

export interface RaceState {
  mode: RaceMode
  activeSessionId: string | null
  upcomingSessionId: string | null
  sessions: RaceSession[]
  timeRemainingSeconds: number
  startedAt: number | null
  lapData: LapData[]
  lastFinishedSessionId: string | null
}