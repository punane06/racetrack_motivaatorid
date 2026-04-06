import type { EmployeeRole } from '@shared/constants.js'

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
