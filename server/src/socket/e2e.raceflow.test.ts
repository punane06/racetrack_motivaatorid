import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server, Socket as IOServerSocket } from 'socket.io';
import { io as createClient, Socket as IOClientSocket } from 'socket.io-client';
import * as http from 'node:http';
import { registerSessionHandlers } from './handlers/sessionHandlers.js';
import { buildAccessKeys } from './auth.js';
import type { RaceState } from '../../../shared/race.js';

const PORT = 45678;

function makeState(): RaceState {
  return {
    mode: 'safe',
    status: 'idle',
    sessions: [
      { id: 's1', label: 'Session 1', status: 'upcoming', drivers: [{ id: 'd1', name: 'Test', carNumber: 1 }] }
    ],
    timeRemainingSeconds: 60,
    raceDurationSeconds: 60,
    startedAt: null,
    activeSessionId: null,
    upcomingSessionId: 's1',
    lastFinishedSessionId: null,
    lapData: [],
  };
}

describe('E2E Race Flow & Auth', () => {
  let ioServer: Server, httpServer: http.Server, client: IOClientSocket, state: RaceState;
  const accessKeys = buildAccessKeys('rec-key', 'safety-key', 'obs-key');

  beforeAll(async () => {
    httpServer = http.createServer();
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    state = makeState();
    ioServer.use((socket: IOServerSocket, next) => {
      // Simple auth middleware
      const { role, key } = socket.handshake.auth as { role: keyof typeof accessKeys; key: string };
      if (accessKeys[role] === key) {
        socket.data.role = role;
        return next();
      }
      return next(new Error('Unauthorized'));
    });
    ioServer.on('connection', (socket: IOServerSocket) => {
      registerSessionHandlers(ioServer, socket, state);
    });
    await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve, reject) => httpServer.close((err?: Error) => err ? reject(err) : resolve()));
  });

  it('should allow authorized client to start race and finish', async () => {
    client = createClient(`ws://localhost:${PORT}`, {
      auth: { role: 'receptionist', key: 'rec-key' },
      transports: ['websocket']
    });
    await new Promise<void>((resolve) => client.on('connect', resolve));
    // Start race
    client.emit('race:start');
    await new Promise<void>((r) => setTimeout(r, 100));
    expect(state.mode).toBe('safe');
    // Try mode change after finish
    state.mode = 'finish';
    let errorMsg = '';
    client.emit('race-mode-change', 'safe');
    client.on('operation:error', (msg: string) => { errorMsg = msg; });
    await new Promise<void>((r) => setTimeout(r, 100));
    expect(errorMsg).toMatch(/Finish is final/);
    client.close();
  });

  it('should reject unauthorized client', async () => {
    const badClient: IOClientSocket = createClient(`ws://localhost:${PORT}`, {
      auth: { role: 'receptionist', key: 'bad-key' },
      transports: ['websocket']
    });
    let error: Error | undefined;
    await new Promise<void>((resolve) => {
      badClient.on('connect_error', (err: Error) => {
        error = err;
        resolve();
      });
    });
    expect(error?.message).toMatch(/Unauthorized/);
    badClient.close();
  });

  it('should remove session from upcoming after race:start', async () => {
    client = createClient(`ws://localhost:${PORT}`, {
      auth: { role: 'receptionist', key: 'rec-key' },
      transports: ['websocket']
    });
    await new Promise<void>((resolve) => client.on('connect', resolve));
    let sessions: any[] = [];
    const nextSessions = new Promise<any[]>((resolve) => {
      client.once('sessions:updated', (s: any[]) => {
        sessions = s;
        resolve(s);
      });
    });
    // Start race
    client.emit('race:start');
    await nextSessions;
    // There should be no session with status 'upcoming'
    expect(sessions.some(s => s.status === 'upcoming')).toBe(false);
    // The session should now be 'active'
    expect(sessions.some(s => s.status === 'active')).toBe(true);
    client.close();
  });
});
