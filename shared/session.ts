export interface Driver {
  id: string
  name: string
  carNumber: number
}

export interface RaceSession {
  id: string
  label: string
  drivers: Driver[]
  status: 'upcoming' | 'active' | 'finished'
}
