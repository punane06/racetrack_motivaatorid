import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'

export const appSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
});
