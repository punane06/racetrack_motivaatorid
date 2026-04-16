import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'


const hasWindow = typeof globalThis.window === 'object';
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 
  (hasWindow
    ? `${globalThis.location.protocol}//${globalThis.location.hostname}:3000`
    : 'http://localhost:3000');

export const appSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  serverUrl,
  {
    autoConnect: true,
    transports: ['websocket'],
  }
)
