import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'

// If VITE_SERVER_URL is set, use it. If not, default to '' (same host / proxy).
const serverUrl = import.meta.env.VITE_SERVER_URL || ''

export const publicSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
  autoConnect: true,
  transports: ['websocket'],
})

export const employeeSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  `${serverUrl}/employee`,
  {
    autoConnect: false,
    transports: ['websocket'],
  },
)
