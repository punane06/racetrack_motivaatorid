import type { RaceState } from 'shared/race.js'

export function createInitialState(raceDurationSeconds: number): RaceState {
  return {
    status: 'idle',
    mode: 'danger',
    activeSessionId: null,
    upcomingSessionId: null,
    sessions: [],
    timeRemainingSeconds: raceDurationSeconds,
    raceDurationSeconds,
    startedAt: null,
    lapData: [],
    lastFinishedSessionId: null,
  }
}