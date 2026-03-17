export type EmployeeRole = 'receptionist' | 'safety' | 'observer'

export const MAX_CARS = 8
export const PROD_RACE_DURATION_SECONDS = 10 * 60
export const DEV_RACE_DURATION_SECONDS = 60

export const ROUTES = {
  frontDesk: '/front-desk',
  raceControl: '/race-control',
  lapLineTracker: '/lap-line-tracker',
  leaderBoard: '/leader-board',
  nextRace: '/next-race',
  raceCountdown: '/race-countdown',
  raceFlags: '/race-flags',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export const PUBLIC_ROUTES = [
  ROUTES.leaderBoard,
  ROUTES.nextRace,
  ROUTES.raceCountdown,
  ROUTES.raceFlags,
] as const

export type PublicRoute = (typeof PUBLIC_ROUTES)[number]

export const EMPLOYEE_ROUTES = [
  ROUTES.frontDesk,
  ROUTES.raceControl,
  ROUTES.lapLineTracker,
] as const

export type EmployeeRoute = (typeof EMPLOYEE_ROUTES)[number]
