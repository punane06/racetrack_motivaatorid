import type { Server, Socket } from 'socket.io'
import type { RaceState } from '@shared/race.js'
import type { RaceSession } from '@shared/session.js'

import { recordLap } from '../../services/lapService.js'
import { getLeaderboard } from '../../services/leaderboardService.js'
import { savePersistedState } from '../../state/persist.js'

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
      broadcastState(io, state)
      emitLeaderboard(io, state)
    }

    if (state.timeRemainingSeconds <= 0) {
      if (raceInterval) {
        clearInterval(raceInterval)
        raceInterval = null
      }

      state.status = 'finished'
      state.mode = 'finish'

      io.emit('race-finished', state)

      broadcastState(io, state)
      emitLeaderboard(io, state)
      savePersistedState(state)
    }
  }, 1000)
}

// =========================
// START RACE
// =========================
function startRace(io: Server, state: RaceState) {
  if (state.status === 'running') return

  const nextSession = state.sessions.find(s => s.status === 'upcoming')

  if (!nextSession) {
    console.log('❌ No upcoming session available')
    return
  }

  state.status = 'running'
  state.mode = 'safe'
  state.timeRemainingSeconds = state.raceDurationSeconds ?? 60
  state.lapData = []

  state.activeSessionId = nextSession.id
  nextSession.status = 'active'

  state.upcomingSessionId = null
  state.startedAt = Date.now()

  startRaceTimer(io, state)

  broadcastState(io, state)
  emitLeaderboard(io, state)
  savePersistedState(state)
}

// =========================
// MODE CONTROL
// =========================
function setRaceMode(io: Server, state: RaceState, mode: string) {
  if (!['safe', 'hazard', 'danger', 'finish'].includes(mode)) return

  if (state.mode === 'finish' && mode !== 'finish') return

  state.mode = mode as RaceState['mode']

  if (mode === 'finish') {
    state.status = 'finished'

    if (raceInterval) {
      clearInterval(raceInterval)
      raceInterval = null
    }
  }

  io.emit('race:mode', state.mode)
  broadcastState(io, state)
  savePersistedState(state)
}

// =========================
// END SESSION (WITH CLEANUP)
// =========================
function endSession(io: Server, state: RaceState) {
  if (state.activeSessionId) {
    const session = state.sessions.find(
      s => s.id === state.activeSessionId
    )
    if (session) session.status = 'finished'
  }

  state.lastFinishedSessionId = state.activeSessionId
  state.activeSessionId = null
  state.status = 'idle'
  state.mode = 'danger'

  // 🔥 MVP REQUIREMENT: remove finished sessions
  state.sessions = state.sessions.filter(s => s.status !== 'finished')

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
      socket.data.role === 'safety'
    )
  }

  // =====================
  // SESSION CREATE
  // =====================
  socket.on('session:create', (label?: string) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized')
      return
    }

    const newSession: RaceSession = {
      id: crypto.randomUUID(),
      label: label?.trim() || `Session ${raceState.sessions.length + 1}`,
      drivers: [],
      status: 'upcoming',
    }

    raceState.sessions.push(newSession)

    if (!raceState.upcomingSessionId) {
      raceState.upcomingSessionId = newSession.id
    }

    broadcastState(io, raceState)
    savePersistedState(raceState)
  })

  // =====================
  // SESSION DELETE (FIXED)
  // =====================
  socket.on('session:delete', (sessionId: string) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized')
      return
    }

    const index = raceState.sessions.findIndex(s => s.id === sessionId)

    if (index === -1) {
      socket.emit('operation:error', 'Session not found')
      return
    }

    raceState.sessions.splice(index, 1)

    if (raceState.activeSessionId === sessionId) {
      raceState.activeSessionId = null
    }

    if (raceState.upcomingSessionId === sessionId) {
      raceState.upcomingSessionId = null
    }

    broadcastState(io, raceState)
    savePersistedState(raceState)
  })

  // =====================
  // LAP TRACKING
  // =====================
  socket.on('lap:record', (carNumber: number) => {
    if (!isAuthorized()) {
      socket.emit('operation:error', 'Unauthorized')
      return
    }

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
    startRace(io, raceState)
  })

  socket.on('race-mode-change', (mode: string) => {
    if (!isAuthorized()) return
    setRaceMode(io, raceState, mode)
  })

  socket.on('race:end_session', () => {
    if (!isAuthorized()) return
    endSession(io, raceState)
  })

  // =====================
  // STATE REQUEST
  // =====================
  socket.on('state:get', (cb) => {
    cb(raceState)
  })
}