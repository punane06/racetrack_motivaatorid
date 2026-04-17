import { Outlet } from 'react-router-dom'
import { NavMenu } from '@/components/NavMenu'

import { AuthGate } from '@/features/auth/AuthGate'

export function EmployeeLayout() {
  return (
    <AuthGate>
      <div className="employee-shell">
        <NavMenu />
        <Outlet />
      </div>
    </AuthGate>
  )
}
