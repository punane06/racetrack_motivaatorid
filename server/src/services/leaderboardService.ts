import type { RaceState } from '@shared/race.js'

export function getLeaderboard(state: RaceState) {
    if (!state.activeSessionId) return []

    const session = state.sessions.find(s => s.id === state.activeSessionId)
    if (!session) return []

    const leaderboard = session.drivers.map(driver => {
        const lap = state.lapData.find(l => l.carNumber === driver.carNumber)

        return {
            driverId: driver.id,
            name: driver.name,
            carNumber: driver.carNumber,
            fastestLap: lap?.fastestLapMs ?? null,
            currentLap: lap?.currentLap ?? 0,
        }
    })

    return leaderboard.sort((a, b) => {
        if (a.fastestLap === null) return 1
        if (b.fastestLap === null) return -1
        return a.fastestLap - b.fastestLap
    })
}