import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'



// Kui VITE_SERVER_URL on määratud, kasuta seda. Kui mitte, kasuta vaikimisi '' (sama host/proxy kaudu)
const serverUrl = import.meta.env.VITE_SERVER_URL || '';

export const appSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  serverUrl,
  {
    autoConnect: true,
    transports: ['websocket'],
  }
)
