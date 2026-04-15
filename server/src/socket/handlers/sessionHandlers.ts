import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events.js';
import type { RaceState } from '@shared/race.js';
import type { RaceSession } from '@shared/session.js';
import { addDriver, createSession, deleteSession, editDriver, removeDriver, assignCarToDriver } from '../../services/sessionService.js';
import { recordLap } from '../../services/lapService.js';

let raceInterval: NodeJS.Timeout | null = null;

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  io.emit('state:updated', raceState);
}

export function startRaceTimer(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  if (raceInterval) {
    clearInterval(raceInterval);
  }
  raceInterval = setInterval(() => {
    if (raceState.timeRemainingSeconds > 0) {
      raceState.timeRemainingSeconds -= 1;
      io.emit('race:tick', raceState.timeRemainingSeconds);
      broadcastState(io, raceState);
    }
    if (raceState.timeRemainingSeconds <= 0) {
      if (raceInterval) {
        clearInterval(raceInterval);
        raceInterval = null;
      }
      raceState.status = 'finished';
      raceState.mode = 'finish';
      io.emit('race:tick', 0);
      broadcastState(io, raceState);
    }
  }, 1000);
}

function startRace(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  if (raceState.status === 'running' || !raceState.upcomingSessionId) return;

  raceState.status = 'running';
  raceState.mode = 'safe'; // Always start in safe mode

  const startedSessionId = raceState.upcomingSessionId;
  raceState.activeSessionId = startedSessionId;

  const activeSession = raceState.sessions.find((s) => s.id === startedSessionId);
  if (activeSession) {
    activeSession.status = 'active';
  }

  const nextUpcoming =
    raceState.sessions.find(
      (session) => session.id !== startedSessionId && session.status === 'upcoming',
    ) ??
    raceState.sessions.find(
      (session) => session.id !== startedSessionId && session.status !== 'finished',
    );

  raceState.upcomingSessionId = nextUpcoming ? nextUpcoming.id : null;

  raceState.startedAt = Date.now();
  raceState.timeRemainingSeconds = raceState.raceDurationSeconds ?? 600;
  raceState.lastFinishedSessionId = null;

  // Broadcast state immediately after setting safe mode
  broadcastState(io, raceState);

  startRaceTimer(io, raceState);
}

function setRaceMode(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState, mode: string) {
  if (!['safe', 'hazard', 'danger', 'finish'].includes(mode)) return;
  // Enforce finish immutability: once finish, cannot change back
  if (raceState.mode === 'finish' && mode !== 'finish') {
    throw new Error('Cannot change mode after finish. Finish is final.');
  }
  const raceMode = mode as RaceState['mode'];
  raceState.mode = raceMode;
  if (raceMode === 'finish') {
    raceState.status = 'finished';
    if (raceInterval) {
      clearInterval(raceInterval);
      raceInterval = null;
    }
  }
  io.emit('race:mode', raceMode);
  broadcastState(io, raceState);
}

function endSession(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  let finishedSessionId: string | null = null;

  if (raceState.activeSessionId) {
    const activeSessionId = raceState.activeSessionId;
    const activeSession = raceState.sessions.find((s: RaceSession) => s.id === activeSessionId);
    if (activeSession) {
      activeSession.status = 'finished';
      finishedSessionId = activeSession.id;
    }
  }

  raceState.lastFinishedSessionId = finishedSessionId;
  raceState.activeSessionId = null;
  raceState.status = 'idle';
  raceState.mode = 'danger';

  if (raceInterval) {
    clearInterval(raceInterval);
    raceInterval = null;
  }

  broadcastState(io, raceState);
}


export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  raceState: RaceState,
) {
  const emitSessionsAndState = () => {
    io.emit('sessions:updated', raceState.sessions);
    io.emit('state:updated', raceState);
  };


  // Helper: check if socket is authorized for mutating events
  function isAuthorized() {
    return socket.data.role === 'receptionist' || socket.data.role === 'safety';
  }

  // Helper: block changes after race has started
  function isRaceModifiable() {
    return raceState.status === 'idle';
  }

  // Mutating events — require authorization
  socket.on('driver:assign_car', (payload: { sessionId: string; driverId: string; carNumber: number }) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      assignCarToDriver(raceState, payload.sessionId, payload.driverId, payload.carNumber);
      emitSessionsAndState();
      // Persist state after mutation
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('driver:add', (payload: { sessionId: string; name: string }) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      addDriver(raceState, payload.sessionId, payload.name);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('driver:edit', (payload: { sessionId: string; driverId: string; name: string }) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      editDriver(raceState, payload.sessionId, payload.driverId, payload.name);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('driver:remove', (payload: { sessionId: string; driverId: string }) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      removeDriver(raceState, payload.sessionId, payload.driverId);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('session:create', (label: string) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      createSession(raceState, label);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('session:delete', (sessionId: string) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    if (!isRaceModifiable()) {
      socket.emit('operation:error', 'Cannot modify drivers or sessions after race has started.');
      return;
    }
    try {
      deleteSession(raceState, sessionId);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('race:start', () => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    try {
      startRace(io, raceState);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('race-mode-change', (mode: string) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    // Enforce finish immutability: block mode changes after finish
    if (raceState.mode === 'finish' && mode !== 'finish') {
      socket.emit('operation:error', 'Cannot change mode after finish. Finish is final.');
      return;
    }
    try {
      setRaceMode(io, raceState, mode);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('race:end_session', () => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    try {
      endSession(io, raceState);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });

  socket.on('lap-recorded', (carNumber: number) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized: insufficient role');
      return;
    }
    try {
      recordLap(raceState, carNumber);
      emitSessionsAndState();
      require('../../state/persist.js').savePersistedState(raceState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.emit('operation:error', message);
    }
  });
}