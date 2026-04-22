import type { Server, Socket } from 'socket.io'
import type { RaceState } from 'shared/race.js'

import { recordLap } from '../../services/lapService.js'
import { getLeaderboard } from '../../services/leaderboardService.js'
import { savePersistedState } from '../../state/persist.js'
import {
  createSession,
  deleteSession,
  addDriver,
  editDriver,
  removeDriver,
  assignCarToDriver
} from '../../services/sessionService.js'
import { AppError } from '../../errors/AppError.js'

let raceInterval: NodeJS.Timeout | null = null

// =========================
// HELPERS
// =========================
function emitLeaderboard(io: Server, state: RaceState) {
  const leaderboard = getLeaderboard(state)
  io.emit('leaderboard:update', leaderboard)
}

function broadcastState(io: Server, state: RaceState) {
  io.emit('state:updated', state)
  io.emit('sessions:updated', state.sessions)

  io.of('/employee').emit('state:updated', state)
  io.of('/employee').emit('sessions:updated', state.sessions)
}

// =========================
// TIMER
// =========================
export function startRaceTimer(io: Server, state: RaceState) {
  if (raceInterval) clearInterval(raceInterval)

  raceInterval = setInterval(() => {
    if (state.timeRemainingSeconds > 0) {
      state.timeRemainingSeconds -= 1

      io.emit('race:tick', state.timeRemainingSeconds)
      io.of('/employee').emit('race:tick', state.timeRemainingSeconds)

      broadcastState(io, state)
      emitLeaderboard(io, state)
    }

    // FIX: Save state every second during countdown
    savePersistedState(state)


    if (state.timeRemainingSeconds <= 0) {
      if (raceInterval) {
        clearInterval(raceInterval)
        raceInterval = null
      }

      state.status = 'finished'
      state.mode = 'finish'

      io.emit('race-finished', state)
      io.of('/employee').emit('race-finished', state)

      broadcastState(io, state)
      emitLeaderboard(io, state)
      savePersistedState(state)
    }
  }, 1000)
}

// =========================
// START RACE (FIXED)
// =========================
function startRace(io: Server, state: RaceState): boolean {
  if (state.status === 'running') return false

  const nextSession = state.sessions.find(s => s.status === 'upcoming')

  if (!nextSession) {
    console.log('❌ No upcoming session available')
    return false
  }

  if (!state.raceDurationSeconds || state.raceDurationSeconds < 10) {
    state.raceDurationSeconds = 600
  }

  state.status = 'running'
  state.mode = 'safe'
  state.timeRemainingSeconds = state.raceDurationSeconds
  state.lapData = []

  state.activeSessionId = nextSession.id
  nextSession.status = 'active'

  // 🔥 FIX: exclude the active session from upcoming
  const nextUpcoming = state.sessions.find(
    s => s.status === 'upcoming' && s.id !== nextSession.id
  )
  state.upcomingSessionId = nextUpcoming?.id ?? null

  state.startedAt = Date.now()

  startRaceTimer(io, state)

  broadcastState(io, state)
  emitLeaderboard(io, state)
  savePersistedState(state)

  return true
}

// =========================
// MODE CONTROL
// =========================
function setRaceMode(io: Server, socket: Socket, state: RaceState, mode: string) {
  if (!['safe', 'hazard', 'danger', 'finish'].includes(mode)) {
    socket.emit('operation:error', 'Invalid race mode')
    return
  }

  if (state.mode === 'finish' && mode !== 'finish') {
    socket.emit('operation:error', 'Finish is final, cannot change race mode')
    return
  }

  state.mode = mode as RaceState['mode']

  if (mode === 'finish') {
    state.status = 'finished'
    if (raceInterval) {
      clearInterval(raceInterval)
      raceInterval = null
    }
  }

  io.emit('race:mode', state.mode)
  io.of('/employee').emit('race:mode', state.mode)

  broadcastState(io, state)
  savePersistedState(state)
}

// =========================
// END SESSION
// =========================
function endSession(io: Server, state: RaceState) {
  if (state.activeSessionId) {
    const session = state.sessions.find(s => s.id === state.activeSessionId)
    if (session) session.status = 'finished'
  }

  state.lastFinishedSessionId = state.activeSessionId
  state.activeSessionId = null
  state.status = 'idle'
  state.mode = 'danger'

  const nextUpcoming = state.sessions.find(s => s.status === 'upcoming')
  state.upcomingSessionId = nextUpcoming?.id ?? null

  if (raceInterval) {
    clearInterval(raceInterval)
    raceInterval = null
  }

  broadcastState(io, state)
  savePersistedState(state)
}

// =========================
// MAIN EXPORT
// =========================
export function registerSessionHandlers(
  io: Server,
  socket: Socket,
  raceState: RaceState
) {
  function isAuthorized() {
    return (
      socket.data.role === 'receptionist' ||
      socket.data.role === 'safety' ||
      socket.data.role === 'observer'
    )
  }

  // =====================
  // SESSION CREATE
  // =====================
  socket.on('session:create', (label?: string, cb?: (sessions: any) => void) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }

    try {
      createSession(raceState, label)
      broadcastState(io, raceState)
      savePersistedState(raceState)
      if (cb) cb(raceState.sessions)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // SESSION DELETE
  // =====================
  socket.on('session:delete', (sessionId: string, cb?: (sessions: any) => void) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }

    try {
      deleteSession(raceState, sessionId)
      broadcastState(io, raceState)
      savePersistedState(raceState)
      if (cb) cb(raceState.sessions)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // DRIVER ADD
  // =====================
  socket.on('driver:add', ({ sessionId, name }, cb) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }

    try {
      addDriver(raceState, sessionId, name)
      broadcastState(io, raceState)
      savePersistedState(raceState)
      if (cb) cb(raceState.sessions)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // DRIVER EDIT
  // =====================
  socket.on('driver:edit', (
    { sessionId, driverId, name }: { sessionId: string; driverId: string; name: string },
    cb?: (sessions: any) => void
  ) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }
    try {
      editDriver(raceState, sessionId, driverId, name)
      broadcastState(io, raceState)
      savePersistedState(raceState)
      if (cb) cb(raceState.sessions)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // DRIVER REMOVE
  // =====================
  socket.on('driver:remove', (
    { sessionId, driverId }: { sessionId: string; driverId: string },
    cb?: (sessions: any) => void
  ) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }
    try {
      removeDriver(raceState, sessionId, driverId)
      broadcastState(io, raceState)
      savePersistedState(raceState)
      if (cb) cb(raceState.sessions)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // DRIVER ASSIGN CAR
  // =====================
  socket.on('driver:assign_car', (
    { sessionId, driverId, carNumber }: { sessionId: string; driverId: string; carNumber: number }
  ) => {
    if (!isAuthorized()) return
    if (raceState.status === 'running') {
      socket.emit('operation:error', 'Cannot modify drivers or sessions during an active race')
      return
    }
    try {
      assignCarToDriver(raceState, sessionId, driverId, carNumber)
      broadcastState(io, raceState)
      savePersistedState(raceState)
    } catch (err) {
      socket.emit('operation:error', err instanceof AppError ? err.message : 'Unknown error')
    }
  })

  // =====================
  // LAP TRACKING
  // =====================
  socket.on('lap-recorded', (carNumber: number) => {
    if (!isAuthorized()) return

    const lap = recordLap(raceState, carNumber)
    if (!lap) return

    emitLeaderboard(io, raceState)
    broadcastState(io, raceState)
    savePersistedState(raceState)
  })

  // =====================
  // RACE CONTROL
  // =====================
  socket.on('race:start', () => {
    if (!isAuthorized()) return

    const started = startRace(io, raceState)
    if (!started) {
      socket.emit('operation:error', 'Cannot start race')
    }
  })

  socket.on('race-mode-change', (mode: string) => {
    if (!isAuthorized()) return
    setRaceMode(io, socket, raceState, mode)
  })

  socket.on('race:end_session', () => {
    if (!isAuthorized()) return
    endSession(io, raceState)
  })

  socket.on('state:get', (cb) => {
    cb(raceState)
  })
}