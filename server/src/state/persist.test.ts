import { describe, it, expect } from 'vitest';
import { savePersistedState, loadPersistedState } from './persist.js';
import type { RaceState } from '@shared/race.js';

function makeState(timeRemainingSeconds: number, startedAt: number): RaceState {
  return {
    status: 'running',
    mode: 'safe',
    activeSessionId: 's1',
    upcomingSessionId: null,
    sessions: [],
    timeRemainingSeconds,
    raceDurationSeconds: 60,
    startedAt,
    lapData: [],
    lastFinishedSessionId: null,
  };
}

describe('Persistence and timer restoration', () => {
  it('restores timer with ms precision after reload', async () => {
    const now = Date.now();
    // Simuleeri, et 10 sekundit tagasi startis
    const startedAt = now - 10000;
    const state = makeState(60, startedAt);
    savePersistedState(state);
    // Laeme state nagu serveri restart
    const loaded = loadPersistedState();
    // Simuleeri taastamisloogikat (nagu index.ts)
    const elapsedMs = Date.now() - loaded.startedAt;
    const durationMs = (loaded.raceDurationSeconds ?? 600) * 1000;
    const restoredTime = Math.max(0, (durationMs - elapsedMs) / 1000);
    // Ootame, et taimer oleks umbes 50 sekundi juures (10 sek kulus)
    expect(restoredTime).toBeGreaterThan(49);
    expect(restoredTime).toBeLessThan(51);
  });
});
