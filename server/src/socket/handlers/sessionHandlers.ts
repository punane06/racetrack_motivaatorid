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

import { AppError } from '../../errors/AppError.js'
import { ErrorCodes } from '../../errors/errorCodes.js'

function handleError(socket: Socket, error: unknown) {
  if (error instanceof AppError) {
    socket.emit('operation:error', {
      code: error.code,
      message: error.message,
    })
  } else {
    socket.emit('operation:error', {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: 'Unexpected server error',
    })
    console.error('Unexpected error:', error)
  }
}

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
      handleError(socket, error)
    }
  })

  socket.on('driver:edit', (payload) => {
    try {
      editDriver(raceState, payload.sessionId, payload.driverId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('driver:remove', (payload) => {
    try {
      removeDriver(raceState, payload.sessionId, payload.driverId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('session:create', (label) => {
    try {
      createSession(raceState, label)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('session:delete', (sessionId) => {
    try {
      deleteSession(raceState, sessionId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })
}
