import { describe, it, expect } from 'vitest';
import { addDriver, editDriver, removeDriver, assignCarToDriver, deleteSession } from './sessionService.js';
import type { RaceState } from '@shared/race.js';

function makeState(sessionStatus: 'upcoming' | 'active' | 'finished' = 'upcoming') {
  return {
    mode: 'safe',
    status: 'idle',
    sessions: [
      { id: 's1', label: 'Session 1', status: sessionStatus, drivers: [{ id: 'd1', name: 'Test', carNumber: 1 }] }
    ],
    timeRemainingSeconds: 60,
    raceDurationSeconds: 60,
    startedAt: null,
    activeSessionId: null,
    upcomingSessionId: 's1',
    lastFinishedSessionId: null,
    lapData: [],
  } as RaceState;
}

describe('Session/driver edit lock', () => {
  it('allows edits when session is upcoming', () => {
    const state = makeState('upcoming');
    // Add a new driver and use its id for subsequent operations
    const newDriver = addDriver(state, 's1', 'New');
    expect(() => editDriver(state, 's1', newDriver.id, 'Edit')).not.toThrow();
    expect(() => assignCarToDriver(state, 's1', newDriver.id, 2)).not.toThrow();
    expect(() => removeDriver(state, 's1', newDriver.id)).not.toThrow();
    expect(() => deleteSession(state, 's1')).not.toThrow();
  });

  it('blocks edits when session is active', () => {
    const state = makeState('active');
    expect(() => addDriver(state, 's1', 'New')).toThrow();
    expect(() => editDriver(state, 's1', 'd1', 'Edit')).toThrow();
    expect(() => removeDriver(state, 's1', 'd1')).toThrow();
    expect(() => assignCarToDriver(state, 's1', 'd1', 2)).toThrow();
    expect(() => deleteSession(state, 's1')).toThrow();
  });

  it('blocks edits when session is finished', () => {
    const state = makeState('finished');
    expect(() => addDriver(state, 's1', 'New')).toThrow();
    expect(() => editDriver(state, 's1', 'd1', 'Edit')).toThrow();
    expect(() => removeDriver(state, 's1', 'd1')).toThrow();
    expect(() => assignCarToDriver(state, 's1', 'd1', 2)).toThrow();
    expect(() => deleteSession(state, 's1')).toThrow();
  });
});
