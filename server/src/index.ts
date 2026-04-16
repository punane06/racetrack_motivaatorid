import dotenv from 'dotenv'
dotenv.config()

import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

import { EMPLOYEE_ROUTES, PUBLIC_ROUTES } from 'shared/constants.js'
import type { ClientToServerEvents, ServerToClientEvents } from 'shared/events.js'

import { loadEnv, printEnvUsage } from './config/env.js'
import { buildAccessKeys, socketAuthMiddleware } from './socket/auth.js'
import { registerSessionHandlers, startRaceTimer } from './socket/handlers/sessionHandlers.js'
import { loadPersistedState, savePersistedState } from './state/persist.js'
import { createInitialState } from './state/store.js'

// =========================
// 1. ENV
// =========================
let env
try {
  env = loadEnv()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[ENV ERROR]:', message)
  printEnvUsage()
  process.exit(1)
}

// =========================
// 2. PATHS
// =========================
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const clientDistPath = resolve(__dirname, '../../client/dist')

// =========================
// 3. EXPRESS
// =========================
const app = express()

app.use(cors({
  origin:
    env.allowedOrigins.length === 1 && env.allowedOrigins[0] === '*'
      ? '*'
      : env.allowedOrigins,
  credentials: true,
}))

app.use(express.json())
app.use(express.static(clientDistPath))

// SPA routes
const firstLevelRoutes = [...EMPLOYEE_ROUTES, ...PUBLIC_ROUTES]
for (const route of firstLevelRoutes) {
  app.get(route, (_req, res) => {
    res.sendFile(resolve(clientDistPath, 'index.html'))
  })
}

// =========================
// 4. STATE INIT
// =========================
let raceState = loadPersistedState()

let shouldRestoreRaceTimer = false

if (!raceState) {
  raceState = createInitialState(env.raceDurationSeconds)
  savePersistedState(raceState)
}

// restore timer
if (raceState.status === 'running' && raceState.startedAt) {
  const elapsedMs = Date.now() - raceState.startedAt
  const durationMs = (raceState.raceDurationSeconds ?? 600) * 1000

  const remaining = Math.max(0, durationMs - elapsedMs)
  raceState.timeRemainingSeconds = Math.floor(remaining / 1000)

  if (raceState.timeRemainingSeconds > 0) {
    shouldRestoreRaceTimer = true
  } else {
    raceState.status = 'finished'
    raceState.mode = 'finish'
  }
}

// autosave
setInterval(() => {
  savePersistedState(raceState)
}, 2000)

// =========================
// 5. HEALTH
// =========================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    sessions: raceState.sessions.length,
    activeSessionId: raceState.activeSessionId,
    upcomingSessionId: raceState.upcomingSessionId,
  })
})

// =========================
// 6. RESET
// =========================
app.post('/state/reset', (req, res) => {
  const key = req.headers['x-access-key']

  if (key !== env.receptionistKey && key !== env.safetyKey) {
    return res.status(403).json({ ok: false, message: 'Forbidden' })
  }

  raceState = createInitialState(env.raceDurationSeconds)
  savePersistedState(raceState)

  res.json({ ok: true })
})

// =========================
// 7. SOCKET
// =========================
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin:
      env.allowedOrigins.length === 1 && env.allowedOrigins[0] === '*'
        ? '*'
        : env.allowedOrigins,
    credentials: true,
  },
})

// =========================
// 8. ACCESS KEYS
// =========================
const accessKeys = buildAccessKeys(env.receptionistKey, env.safetyKey, env.observerKey)

// =========================
// 9. SOCKET NAMESPACES
// =========================
// Public screens use the default namespace (no access key required)
io.on('connection', (socket) => {
  console.log(`[SOCKET][public] connected: ${socket.id} IP: ${socket.handshake.address}`)
  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET][public] disconnected: ${socket.id} reason: ${reason}`)
  })
  socket.on('state:get', (cb) => cb(raceState))
})

// Employee screens connect to /employee and must provide access key BEFORE connection is established
const employeeNsp = io.of('/employee')
employeeNsp.use(socketAuthMiddleware(accessKeys))
employeeNsp.on('connection', (socket) => {
  console.log(
    `[SOCKET][employee] connected: ${socket.id} IP: ${socket.handshake.address} role: ${socket.data.role}`,
  )
  socket.on('disconnect', (reason) => {
    console.log(`[SOCKET][employee] disconnected: ${socket.id} reason: ${reason}`)
  })

  socket.on('state:get', (cb) => cb(raceState))

  // state mutation handlers
  registerSessionHandlers(io, socket, raceState)
})

// =========================
// 10. START SERVER
// =========================
httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`)
})

// =========================
// 11. RESTORE TIMER
// =========================
if (shouldRestoreRaceTimer) {
  startRaceTimer(io, raceState)
}

