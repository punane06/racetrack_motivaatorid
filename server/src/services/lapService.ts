import type { RaceState } from 'shared/race.js'

export function recordLap(state: RaceState, carNumber: number) {
    if (state.status !== 'running' && state.mode !== 'finish') return null

    const now = Date.now()

    let lap = state.lapData.find(l => l.carNumber === carNumber)

    if (!lap) {
        lap = {
            carNumber,
            currentLap: 0,
            fastestLapMs: null,
            lastCrossedAt: null,
        }
        state.lapData.push(lap)
    }

    if (lap.lastCrossedAt !== null) {
        const lapTime = now - lap.lastCrossedAt

        if (!lap.fastestLapMs || lapTime < lap.fastestLapMs) {
            lap.fastestLapMs = lapTime
        }
    }

    lap.currentLap += 1
    lap.lastCrossedAt = now

    return lap
}