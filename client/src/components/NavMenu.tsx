import { NavLink } from 'react-router-dom'
import { ROUTES } from '@shared/constants'

const navLinks = [
  { to: ROUTES.frontDesk, label: 'Front Desk' },
  { to: ROUTES.raceControl, label: 'Race Control' },
  { to: ROUTES.lapLineTracker, label: 'Lap Tracker' },
  { to: ROUTES.leaderBoard, label: 'Leader Board' },
  { to: ROUTES.nextRace, label: 'Next Race' },
  { to: ROUTES.raceCountdown, label: 'Countdown' },
  { to: ROUTES.raceFlags, label: 'Race Flags' },
]

export function NavMenu() {
  return (
    <nav className="nav-menu">
      {navLinks.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
