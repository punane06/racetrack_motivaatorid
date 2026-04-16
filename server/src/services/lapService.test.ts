
import { describe, it, expect } from 'vitest';
import { recordLap } from './lapService.js';
import type { RaceState } from 'shared/race.js';

function makeState(status: 'idle' | 'running' | 'finished', mode: 'safe' | 'hazard' | 'danger' | 'finish'): RaceState {
  return {
    status,
    mode,
    activeSessionId: 's1',
    upcomingSessionId: null,
    sessions: [],
    timeRemainingSeconds: 10,
    raceDurationSeconds: 10,
    startedAt: Date.now(),
    lapData: [],
    lastFinishedSessionId: null,
  };
}

describe('Lap recording during finish', () => {

  it('allows lap recording when running', () => {
    const state = makeState('running', 'danger');
    const lap = recordLap(state, 1);
    expect(lap).not.toBeNull();
    expect(state.lapData.length).toBe(1);
  });

  it('allows lap recording in finish mode (not finished)', () => {
    const state = makeState('running', 'finish');
    const lap = recordLap(state, 1);
    expect(lap).not.toBeNull();
    expect(state.lapData.length).toBe(1);
  });

  it('allows lap recording in finish mode even if status is not running', () => {
    const state = makeState('finished', 'finish');
    const lap = recordLap(state, 1);
    expect(lap).not.toBeNull();
    expect(state.lapData.length).toBe(1);
  });

  it('blocks lap recording if not running and not finish mode', () => {
    const state = makeState('idle', 'safe');
    const lap = recordLap(state, 1);
    expect(lap).toBeNull();
    expect(state.lapData.length).toBe(0);
  });
});
