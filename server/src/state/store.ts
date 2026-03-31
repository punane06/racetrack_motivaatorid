import type { RaceState } from '@shared/race'

export function createInitialState(raceDurationSeconds: number): RaceState {
  return {
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