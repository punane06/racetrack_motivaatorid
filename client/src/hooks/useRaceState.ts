import { useEffect, useState } from 'react'
import { appSocket } from '../lib/socket'
import type { RaceState } from '@shared/race'

export function useRaceState(): RaceState | null {
  const [state, setState] = useState<RaceState | null>(null)

  useEffect(() => {
    const onUpdate = (s: RaceState) => setState(s)
    const onTick = (secs: number) =>
      setState((prev) => (prev ? { ...prev, timeRemainingSeconds: secs } : prev))
    const fetch = () => appSocket.emit('state:get', setState)

    appSocket.on('connect', fetch)
    appSocket.on('state:updated', onUpdate)
    appSocket.on('race:tick', onTick)
    if (appSocket.connected) fetch()

    return () => {
      appSocket.off('connect', fetch)
      appSocket.off('state:updated', onUpdate)
      appSocket.off('race:tick', onTick)
    }
  }, [])

  return state
}
