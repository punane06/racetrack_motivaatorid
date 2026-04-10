import type { RaceState } from '@shared/race.js'

export function getLeaderboard(state: RaceState) {
    if (!state.activeSessionId) return []

    const session = state.sessions.find(s => s.id === state.activeSessionId)
    if (!session) return []

    return session.drivers
        .map(driver => {
            const laps = state.lapData.filter(l => l.carNumber === driver.carNumber)

            const lapTimes = laps
                .map(l => l.fastestLapMs)
                .filter((time): time is number => time !== null)
            const fastestLap = lapTimes.length > 0 ? Math.min(...lapTimes) : null

            return {
                driverId: driver.id,
                name: driver.name,
                carNumber: driver.carNumber,
                fastestLap,
                laps: laps.length
            }
        })
        .sort((a, b) => {
            if (a.fastestLap === null) return 1
            if (b.fastestLap === null) return -1
            return a.fastestLap - b.fastestLap
        })
}