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

export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  raceState: RaceState,
) {
  socket.on('driver:add', (payload) => {
    try {
      addDriver(raceState, payload.sessionId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('driver:edit', (payload) => {
    try {
      editDriver(raceState, payload.sessionId, payload.driverId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('driver:remove', (payload) => {
    try {
      removeDriver(raceState, payload.sessionId, payload.driverId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('session:create', (label) => {
    try {
      createSession(raceState, label)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })

  socket.on('session:delete', (sessionId) => {
    try {
      deleteSession(raceState, sessionId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      socket.emit('operation:error', message)
    }
  })
}
