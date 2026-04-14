import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events.js';
import type { RaceState } from '@shared/race.js';
import { getLeaderboard } from '../../services/leaderboardService.js';

let raceInterval: NodeJS.Timeout | null = null;
const RACE_DURATION = 60;

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  io.emit('state:updated', state);
}

function emitLeaderboard(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  const leaderboard = getLeaderboard(state);
  io.emit('leaderboard:update', leaderboard);
}

function startRace(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  // ...korrektne loogika...
}

function setRaceMode(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState, mode: string) {
  // ...korrektne loogika...
}

function endSession(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  // ...korrektne loogika...
}

export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  state: RaceState
) {
  // ...kõik socket.on() handlerid, mis kasutavad samu state ja io objekte...
}