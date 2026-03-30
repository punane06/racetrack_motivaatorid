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
    console.log(`[EVENT] driver:add → name="${payload.name}", session=${payload.sessionId}`)
    try {
      addDriver(raceState, payload.sessionId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('driver:edit', (payload) => {
    console.log(`[EVENT] driver:edit → driver=${payload.driverId}, session=${payload.sessionId}, newName="${payload.name}"`)
    try {
      editDriver(raceState, payload.sessionId, payload.driverId, payload.name)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('driver:remove', (payload) => {
    console.log(`[EVENT] driver:remove → driver=${payload.driverId}, session=${payload.sessionId}`)
    try {
      removeDriver(raceState, payload.sessionId, payload.driverId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('session:create', (label) => {
    console.log(`[EVENT] session:create → label="${label}"`)
    try {
      createSession(raceState, label)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })

  socket.on('session:delete', (sessionId) => {
    console.log(`[EVENT] session:delete → session=${sessionId}`)
    try {
      deleteSession(raceState, sessionId)
      io.emit('sessions:updated', raceState.sessions)
    } catch (error) {
      handleError(socket, error)
    }
  })
}
