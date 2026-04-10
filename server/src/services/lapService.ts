import type { RaceState } from '@shared/race.js'

import type { LapData } from '@shared/lap.js'

export function recordLap(state: RaceState, carNumber: number) {
    if (state.status !== 'running') return null

    const now = Date.now()

    const lastLap = state.lapData.find((l) => l.carNumber === carNumber)

    if (lastLap) {
        if (lastLap.lastCrossedAt !== null) {
            const lapMs = now - lastLap.lastCrossedAt
            if (lastLap.fastestLapMs === null || lapMs < lastLap.fastestLapMs) {
                lastLap.fastestLapMs = lapMs
            }
        }
        lastLap.currentLap += 1
        lastLap.lastCrossedAt = now
        return lastLap
    }

    const newLap: LapData = {
        carNumber,
        currentLap: 1,
        fastestLapMs: null,
        lastCrossedAt: now,
    }

    state.lapData.push(newLap)
    return newLap
}

// The last lap for a car is the latest entry in state.lapData, which is stored directly.
// Because lapData contains a single aggregate record per car, we can find it by car number.
// The original timestamp-based timing is now represented by lastCrossedAt.
function getLastLap(state: RaceState, carNumber: number): LapData | undefined {
    return state.lapData.find((l) => l.carNumber === carNumber)
}