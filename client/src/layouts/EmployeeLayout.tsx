import { Outlet } from 'react-router-dom'

import { AuthGate } from '@/features/auth/AuthGate'

export function EmployeeLayout() {
  return (
    <AuthGate>
      <div className="employee-shell">
        <Outlet />
      </div>
    </AuthGate>
  )
}
