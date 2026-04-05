import type { RaceState } from 'shared/dist/race.js'

export function createInitialState(raceDurationSeconds: number): RaceState {
  return {
    status: 'idle',
    mode: 'danger',
    activeSessionId: null,
    upcomingSessionId: null,
    sessions: [],
    timeRemainingSeconds: raceDurationSeconds,
    startedAt: null,
    lapData: [],
    lastFinishedSessionId: null,
  }
}