import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { registerSessionHandlers } from './sessionHandlers.js';
import type { RaceState } from '../../../../shared/race.js';

import { describe, it, beforeEach, expect, vi } from 'vitest';

describe('Finish mode immutability', () => {
  let io: Server;
  let httpServer: any;
  let raceState: RaceState;
  let socket: any;

  beforeEach(() => {
    httpServer = createServer();
    io = new Server(httpServer);
    raceState = {
      mode: 'safe',
      status: 'idle',
      sessions: [],
      timeRemainingSeconds: 60,
      raceDurationSeconds: 60,
      startedAt: null,
      activeSessionId: null,
      upcomingSessionId: null,
      lastFinishedSessionId: null,
      lapData: [],
    };
    socket = { on: vi.fn(), emit: vi.fn(), data: { role: 'receptionist' } };
    registerSessionHandlers(io, socket, raceState);
    // No async setup needed
  });

  it('should not allow mode change after finish', () => {
    raceState.mode = 'finish';
    // Simulate race-mode-change event
    const handler = socket.on.mock.calls.find(([event]: [any]) => event === 'race-mode-change')[1];
    handler('safe');
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Finish is final'));
  });

  it('should allow race:end_session after finish', () => {
    raceState.mode = 'finish';
    const handler = socket.on.mock.calls.find(([event]: [any]) => event === 'race:end_session')[1];
    handler();
    // Should not emit operation:error for end_session
    expect(socket.emit).not.toHaveBeenCalledWith('operation:error', expect.stringContaining('Finish is final'));
  });
});

describe('Race start and session/driver lock', () => {
  let io: Server;
  let httpServer: any;
  let raceState: RaceState;
  let socket: any;

  beforeEach(() => {
    httpServer = createServer();
    io = new Server(httpServer);
    raceState = {
      mode: 'danger',
      status: 'idle',
      sessions: [
        { id: 's1', label: 'Session 1', status: 'upcoming', drivers: [] }
      ],
      timeRemainingSeconds: 60,
      raceDurationSeconds: 60,
      startedAt: null,
      activeSessionId: null,
      upcomingSessionId: 's1',
      lastFinishedSessionId: null,
      lapData: [],
    };
    socket = { on: vi.fn(), emit: vi.fn(), data: { role: 'receptionist' } };
    registerSessionHandlers(io, socket, raceState);
  });

  it('should set mode to safe on race:start', () => {
    // Simulate race:start event
    const handler = socket.on.mock.calls.find(([event]: [any]) => event === 'race:start')[1];
    handler();
    expect(raceState.mode).toBe('safe');
  });

  it('should block driver/session changes after race start', () => {
    // Start the race
    raceState.status = 'running';
    // Try to add driver
    const addHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'driver:add')[1];
    addHandler({ sessionId: 's1', name: 'Test' });
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
    // Try to edit driver
    const editHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'driver:edit')[1];
    editHandler({ sessionId: 's1', driverId: 'd1', name: 'New' });
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
    // Try to remove driver
    const removeHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'driver:remove')[1];
    removeHandler({ sessionId: 's1', driverId: 'd1' });
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
    // Try to assign car
    const assignHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'driver:assign_car')[1];
    assignHandler({ sessionId: 's1', driverId: 'd1', carNumber: 1 });
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
    // Try to create session
    const createHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'session:create')[1];
    createHandler('New Session');
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
    // Try to delete session
    const deleteHandler = socket.on.mock.calls.find(([event]: [any]) => event === 'session:delete')[1];
    deleteHandler('s1');
    expect(socket.emit).toHaveBeenCalledWith('operation:error', expect.stringContaining('Cannot modify drivers or sessions'));
  });
});
