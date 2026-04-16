import { useEffect, useState } from 'react'
import { publicSocket } from '../lib/socket'
import type { RaceState } from '@shared/race'

export function useRaceState(): RaceState | null {
  const [state, setState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onUpdate = (s: RaceState) => setState(s)
    const onTick = (secs: number) =>
      setState((prev) => (prev ? { ...prev, timeRemainingSeconds: secs } : prev))
    const fetch = () => publicSocket.emit('state:get', setState)

    publicSocket.on('connect', fetch)
    publicSocket.on('state:updated', onUpdate)
    publicSocket.on('race:tick', onTick)
    if (publicSocket.connected) fetch()

    return () => {
      publicSocket.off('connect', fetch)
      publicSocket.off('state:updated', onUpdate)
      publicSocket.off('race:tick', onTick)
    }
  }, [])

  return state
}
