export type EmployeeRole = 'receptionist' | 'safety' | 'observer'

export const MAX_CARS = 8
export const PROD_RACE_DURATION_SECONDS = 10 * 60
export const DEV_RACE_DURATION_SECONDS = 60

export const PUBLIC_ROUTES = [
  '/leader-board',
  '/next-race',
  '/race-countdown',
  '/race-flags',
] as const

export const EMPLOYEE_ROUTES = [
  '/front-desk',
  '/race-control',
  '/lap-line-tracker',
] as const
