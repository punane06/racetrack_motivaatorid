import { Outlet } from 'react-router-dom'
import { NavMenu } from '@/components/NavMenu'

export function PublicLayout() {
  return (
    <div className="public-shell">
      <NavMenu />
      <Outlet />
    </div>
  )
}
