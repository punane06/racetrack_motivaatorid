import type { Socket } from 'socket.io'

// Socket.IO middleware for connection-level auth
export function socketAuthMiddleware(accessKeys: AccessKeys) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const { role, key } = socket.handshake.auth || {}
    if (!role || !key) {
      return next(new Error('Missing role or key'))
    }
    const ok = await validateAccess(role, key, accessKeys)
    if (!ok) {
      return next(new Error('Invalid access key'))
    }
    socket.data.role = role
    next()
  }
}
import type { EmployeeRole } from 'shared/constants.js'

interface AccessKeys {
  receptionist: string
  safety: string
  observer: string
}

export function buildAccessKeys(receptionistKey: string, safetyKey: string, observerKey: string): AccessKeys {
  return {
    receptionist: receptionistKey,
    safety: safetyKey,
    observer: observerKey,
  }
}

export async function validateAccess(role: EmployeeRole, key: string, accessKeys: AccessKeys): Promise<boolean> {
  if (accessKeys[role] === key) {
    return true
  }

  await new Promise((resolve) => setTimeout(resolve, 500))
  return false
}
