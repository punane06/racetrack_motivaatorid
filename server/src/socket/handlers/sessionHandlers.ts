import type { Server, Socket } from 'socket.io'

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'
import type { RaceState } from '@shared/race'
import {
  addDriver,
  createSession,
  deleteSession,
  editDriver,
  removeDriver,
} from '../../services/sessionService.js'

let raceInterval: NodeJS.Timeout | null = null

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  io.emit('state:updated', raceState)
}

function startRace(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  if (raceState.status === 'running' || !raceState.upcomingSessionId) return

  raceState.status = 'running'
  raceState.activeSessionId = raceState.upcomingSessionId
  raceState.upcomingSessionId = null
  raceState.startedAt = Date.now()

  if (raceInterval) {
    clearInterval(raceInterval)
  }

  raceInterval = setInterval(() => {
    if (raceState.timeRemainingSeconds > 0) {
      raceState.timeRemainingSeconds -= 1
      io.emit('race:tick', raceState.timeRemainingSeconds)
      broadcastState(io, raceState)
    }
    if (raceState.timeRemainingSeconds <= 0) {
      if (raceInterval) {
        clearInterval(raceInterval)
        raceInterval = null
      }
      raceState.status = 'finished'
      io.emit('race:tick', 0)
      broadcastState(io, raceState)
    }
  }, 1000)
}

function setRaceMode(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState, mode: string) {
  if (!['safe', 'hazard', 'danger', 'finish'].includes(mode)) return
  raceState.mode = mode as RaceState['mode']
  io.emit('race:mode', mode)
  broadcastState(io, raceState)
}

function endSession(io: Server<ClientToServerEvents, ServerToClientEvents>, raceState: RaceState) {
  if (raceState.activeSessionId) {
    const activeSessionId = raceState.activeSessionId
    const activeSession = raceState.sessions.find((s) => s.id === activeSessionId)
    if (activeSession) activeSession.status = 'finished'
  }
  raceState.activeSessionId = null
  raceState.status = 'idle'
  if (raceInterval) {
    clearInterval(raceInterval)
    raceInterval = null
  }
  broadcastState(io, raceState)
}

export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  raceState: RaceState,
) {
  socket.on('driver:add', (payload: { sessionId: string; name: string }) => {
    try {
      addDriver(raceState, payload.sessionId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('driver:edit', (payload: { sessionId: string; driverId: string; name: string }) => {
    try {
      editDriver(raceState, payload.sessionId, payload.driverId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('driver:remove', (payload: { sessionId: string; driverId: string }) => {
    try {
      removeDriver(raceState, payload.sessionId, payload.driverId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('session:create', (label: string) => {
    try {
      createSession(raceState, label)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('session:delete', (sessionId: string) => {
    try {
      deleteSession(raceState, sessionId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('race:start', () => {
    try {
      startRace(io, raceState)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('race:mode_change', (mode: string) => {
    try {
      setRaceMode(io, raceState, mode)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('race:end_session', () => {
    try {
      endSession(io, raceState)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })
}
