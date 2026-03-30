// 1. Load .env and validate env

import dotenv from 'dotenv'
dotenv.config()

import { loadEnv, printEnvUsage } from './config/env.js'

let env
try {
  env = loadEnv()
  console.log('[ENV] All required environment variables are present')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[ENV] Error loading environment variables:', message)
  printEnvUsage()
  process.exit(1)
}

// 2. Imports

import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

import { EMPLOYEE_ROUTES, PUBLIC_ROUTES } from '@shared/constants'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'

import { validateAccess, buildAccessKeys } from './socket/auth.js'
import { registerSessionHandlers } from './socket/handlers/sessionHandlers.js'
import { createInitialState } from './state/store.js'
import { loadPersistedState, savePersistedState } from './state/persist.js'

// 3. Paths

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const clientDistPath = resolve(__dirname, '../../client/dist')

// 4. Express setup

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(clientDistPath))

// Serve SPA routes

const firstLevelRoutes = [...EMPLOYEE_ROUTES, ...PUBLIC_ROUTES]

for (const route of firstLevelRoutes) {
  app.get(route, (_req, res) => {
    res.sendFile(resolve(clientDistPath, 'index.html'))
  })
}

// 5. Health check endpoint

app.get('/health', (req, res) => {
  console.log('[HEALTH] Health check requested')
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessions: raceState.sessions.length,
    activeSessionId: raceState.activeSessionId,
    upcomingSessionId: raceState.upcomingSessionId,
  })
})

// 6. State loading + autosave
let raceState = loadPersistedState()

if (!raceState) {
  console.log('[STATE] No persisted state found, creating initial state')
  raceState = createInitialState(env.raceDurationSeconds)
  savePersistedState(raceState)
}

setInterval(() => {
  savePersistedState(raceState)
}, 2000)

// 7. Access keys
const accessKeys = buildAccessKeys(
  env.receptionistKey,
  env.safetyKey,
  env.observerKey
)

// 8. Socket.IO setup
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
})

io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`)
  registerSessionHandlers(io, socket, raceState)

  socket.on('auth:check', async (payload, callback) => {
    console.log(`[AUTH] Checking access for role="${payload.role}"`)
    const ok = await validateAccess(payload.role, payload.key, accessKeys)
    callback(ok ? { ok: true } : { ok: false, message: 'Invalid access key.' })
  })

  socket.on('state:get', (callback) => {
    console.log(`[STATE] Client requested full state`)
    callback(raceState)
  })
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`)
  })
})

// 9. Start server
httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`)
  console.log(`Race duration: ${env.raceDurationSeconds} seconds`)
})
