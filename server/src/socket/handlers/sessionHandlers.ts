import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events.js'
import type { RaceState } from '@shared/race.js'
import type { RaceSession } from '@shared/session.js'

import {
  addDriver,
  createSession,
  deleteSession,
  editDriver,
  removeDriver
} from '../../services/sessionService.js'

import { recordLap } from '../../services/lapService.js'
import { getLeaderboard } from '../../services/leaderboardService.js'

let raceInterval: NodeJS.Timeout | null = null
const RACE_DURATION = 60

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  io.emit('state:updated', state)
}

function emitLeaderboard(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  const leaderboard = getLeaderboard(state)
  io.emit('leaderboard:update', leaderboard)
}

// =========================
// RACE CONTROL
// =========================
function startRace(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState) {
  if (state.status === 'running' || !state.upcomingSessionId) return

  state.status = 'running'
  state.mode = 'safe'
  state.timeRemainingSeconds = RACE_DURATION
  state.lapData = []

  state.activeSessionId = state.upcomingSessionId

  const session = state.sessions.find((s: RaceSession) => s.id === state.activeSessionId)
  if (session) session.status = 'active'

  const next = state.sessions.find(s => s.status === 'upcoming' && s.id !== session?.id)
  state.upcomingSessionId = next ? next.id : null

  state.startedAt = Date.now()

  if (raceInterval) clearInterval(raceInterval)

  raceInterval = setInterval(() => {
    if (state.timeRemainingSeconds > 0) {
      state.timeRemainingSeconds -= 1
      io.emit('race:tick', state.timeRemainingSeconds)

      broadcastState(io, state)
      emitLeaderboard(io, state)
    }

    if (state.timeRemainingSeconds <= 0) {
      if (raceInterval) clearInterval(raceInterval)

      state.status = 'finished'
      state.mode = 'finish'

      io.emit('race-finished', state)

      broadcastState(io, state)
      emitLeaderboard(io, state)
    }
  }, 1000)
}

function setRaceMode(io: Server<ClientToServerEvents, ServerToClientEvents>, state: RaceState, mode: string) {
  if (state.status === 'finished') return
  if (!['safe', 'hazard', 'danger', 'finish'].includes(mode)) return

  state.mode = mode as RaceState['mode']

  io.emit('race:mode', state.mode)
  broadcastState(io, state)
}

// =========================
// HANDLERS
// =========================
export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  state: RaceState
) {
  const emitAll = () => {
    io.emit('sessions:updated', state.sessions)
    io.emit('next-session-updated', state)
    io.emit('state:updated', state)
  }

  // SESSION
  socket.on('session:create', () => {
    const session = createSession(state)
    if (!state.upcomingSessionId) {
      state.upcomingSessionId = session.id
    }
    emitAll()
  })

  socket.on('session:delete', (id) => {
    deleteSession(state, id)
    emitAll()
  })

  // DRIVER
  socket.on('driver:add', ({ sessionId, name }) => {
    addDriver(state, sessionId, name)
    emitAll()
  })

  socket.on('driver:edit', ({ sessionId, driverId, name }) => {
    editDriver(state, sessionId, driverId, name)
    emitAll()
  })

  socket.on('driver:remove', ({ sessionId, driverId }) => {
    removeDriver(state, sessionId, driverId)
    emitAll()
  })

  // 🔥 LAP TRACKING
  socket.on('lap:record', (carNumber: number) => {
    const lap = recordLap(state, carNumber)
    if (!lap) return

    io.emit('lap-recorded', state.lapData)

    emitLeaderboard(io, state)
  })

  // RACE
  socket.on('race:start', () => {
    startRace(io, state)
    emitAll()
  })

  socket.on('race-mode-change', (mode) => {
    setRaceMode(io, state, mode)
    emitAll()
  })
}
