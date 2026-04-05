import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

import { EMPLOYEE_ROUTES, PUBLIC_ROUTES } from '@shared/constants'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'
import type { LapData } from '@shared/lap'
import type { RaceMode } from '@shared/race'
import type { RaceSession } from '@shared/session'
import { loadEnv, printEnvUsage } from './config/env.js'
import { validateAccess, buildAccessKeys } from './socket/auth.js'
import { registerSessionHandlers } from './socket/handlers/sessionHandlers.js'
import { createInitialState } from './state/store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const clientDistPath = resolve(__dirname, '../../client/dist')

let env
try {
  env = loadEnv()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  printEnvUsage()
  process.exit(1)
}

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(clientDistPath))

const firstLevelRoutes = [...EMPLOYEE_ROUTES, ...PUBLIC_ROUTES]

for (const route of firstLevelRoutes) {
  app.get(route, (_req, res) => {
    res.sendFile(resolve(clientDistPath, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
})

const raceState = createInitialState(env.raceDurationSeconds)
const accessKeys = buildAccessKeys(env.receptionistKey, env.safetyKey, env.observerKey)

let raceInterval: NodeJS.Timeout | null = null

function emitState() {
  io.emit('state:updated', raceState)
}

function findSessionById(sessionId: string | null): RaceSession | null {
  if (!sessionId) {
    return null
  }
  return raceState.sessions.find((session) => session.id === sessionId) ?? null
}

function recomputeUpcomingSessionId(excludeId: string | null = null): string | null {
  const nextUpcoming = raceState.sessions.find(
    (session) => session.status === 'upcoming' && session.id !== excludeId,
  )
  return nextUpcoming?.id ?? null
}

function createLapDataForActiveSession(activeSession: RaceSession): LapData[] {
  return activeSession.drivers.map((driver) => ({
    carNumber: driver.carNumber,
    currentLap: 0,
    fastestLapMs: null,
    lastCrossedAt: null,
  }))
}

function stopRaceTimer() {
  if (raceInterval) {
    clearInterval(raceInterval)
    raceInterval = null
  }
}

function startRaceTimer() {
  stopRaceTimer()

  raceInterval = setInterval(() => {
    if (!raceState.activeSessionId) {
      stopRaceTimer()
      return
    }

    if (raceState.mode === 'finish') {
      stopRaceTimer()
      return
    }

    if (raceState.timeRemainingSeconds > 0) {
      raceState.timeRemainingSeconds -= 1
      io.emit('race:tick', raceState.timeRemainingSeconds)
    }

    if (raceState.timeRemainingSeconds <= 0) {
      raceState.timeRemainingSeconds = 0
      raceState.mode = 'finish'
      io.emit('race:tick', raceState.timeRemainingSeconds)
      emitState()
      stopRaceTimer()
    }
  }, 1000)
}

function setRaceMode(socketId: string, mode: RaceMode) {
  if (!raceState.activeSessionId) {
    io.to(socketId).emit('operation:error', 'No active race session.')
    return
  }

  if (raceState.mode === 'finish' && mode !== 'finish') {
    io.to(socketId).emit('operation:error', 'Race mode cannot change after finish.')
    return
  }

  raceState.mode = mode
  emitState()
}

io.on('connection', (socket) => {
  registerSessionHandlers(io, socket, raceState)

  socket.on('auth:check', async (payload, callback) => {
    const ok = await validateAccess(payload.role, payload.key, accessKeys)
    callback(ok ? { ok: true } : { ok: false, message: 'Invalid access key.' })
  })

  socket.on('state:get', (callback) => {
    callback(raceState)
  })

  socket.on('race:start', () => {
    if (raceState.activeSessionId) {
      socket.emit('operation:error', 'Race is already active.')
      return
    }

    if (!raceState.upcomingSessionId) {
      socket.emit('operation:error', 'No upcoming session to start.')
      return
    }

    const nextSession = findSessionById(raceState.upcomingSessionId)
    if (!nextSession) {
      socket.emit('operation:error', 'Upcoming session not found.')
      return
    }

    nextSession.status = 'active'
    raceState.activeSessionId = nextSession.id
    raceState.upcomingSessionId = recomputeUpcomingSessionId(nextSession.id)
    raceState.mode = 'safe'
    raceState.startedAt = Date.now()
    raceState.timeRemainingSeconds = env.raceDurationSeconds
    raceState.lapData = createLapDataForActiveSession(nextSession)

    io.emit('race:tick', raceState.timeRemainingSeconds)
    emitState()
    startRaceTimer()
  })

  socket.on('race:mode_change', (mode) => {
    setRaceMode(socket.id, mode)
  })

  socket.on('lap:record', (carNumber) => {
    if (!raceState.activeSessionId) {
      socket.emit('operation:error', 'No active race session.')
      return
    }

    const lap = raceState.lapData.find((item) => item.carNumber === carNumber)
    if (!lap) {
      socket.emit('operation:error', `Car #${carNumber} is not in active session.`)
      return
    }

    const now = Date.now()

    lap.currentLap += 1

    if (lap.lastCrossedAt !== null) {
      const lapTime = now - lap.lastCrossedAt
      if (lap.fastestLapMs === null || lapTime < lap.fastestLapMs) {
        lap.fastestLapMs = lapTime
      }
    }

    lap.lastCrossedAt = now

    io.emit('lap:recorded', raceState.lapData)
    emitState()
  })

  socket.on('race:end_session', () => {
    if (!raceState.activeSessionId) {
      socket.emit('operation:error', 'No active race session.')
      return
    }

    if (raceState.mode !== 'finish') {
      socket.emit('operation:error', 'Session can be ended only in finish mode.')
      return
    }

    const activeSession = findSessionById(raceState.activeSessionId)
    if (!activeSession) {
      socket.emit('operation:error', 'Active session not found.')
      return
    }

    activeSession.status = 'finished'
    raceState.lastFinishedSessionId = activeSession.id
    raceState.activeSessionId = null
    raceState.mode = 'danger'
    raceState.startedAt = null
    raceState.timeRemainingSeconds = env.raceDurationSeconds
    raceState.lapData = []
    raceState.upcomingSessionId = recomputeUpcomingSessionId()

    stopRaceTimer()
    emitState()
  })

  socket.on('disconnect', () => {
    // no-op
  })
})

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`)
  console.log(`Race duration: ${env.raceDurationSeconds} seconds`)
})