
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
