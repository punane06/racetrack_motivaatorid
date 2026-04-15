import dotenv from 'dotenv'
dotenv.config()
import { loadEnv, printEnvUsage } from './config/env.js'
import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { EMPLOYEE_ROUTES, PUBLIC_ROUTES } from '@shared/constants.js'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events.js'
import { buildAccessKeys, validateAccess } from './socket/auth.js'
import { registerSessionHandlers, startRaceTimer } from './socket/handlers/sessionHandlers.js'
import { createInitialState } from './state/store.js'
import { loadPersistedState, savePersistedState } from './state/persist.js'



// 1. Load and validate env
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

// 2. Paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const clientDistPath = resolve(__dirname, '../../client/dist')

// 3. Express setup
const app = express()
const corsOptions = {
  origin: env.allowedOrigins.length === 1 && env.allowedOrigins[0] === '*' ? '*' : env.allowedOrigins,
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.static(clientDistPath))

// Serve SPA routes
const firstLevelRoutes = [...EMPLOYEE_ROUTES, ...PUBLIC_ROUTES]
for (const route of firstLevelRoutes) {
  app.get(route, (_req, res) => {
    res.sendFile(resolve(clientDistPath, 'index.html'))
  })
}

// 4. Health check endpoint
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

// 5. State reset endpoint
app.post('/state/reset', (req, res) => {
  const key = req.headers['x-access-key']
  if (key !== env.receptionistKey && key !== env.safetyKey) {
    console.warn('[STATE] Unauthorized reset attempt')
    return res.status(403).json({ ok: false, message: 'Forbidden' })
  }
  console.log('[STATE] Reset requested — creating fresh state')
  raceState = createInitialState(env.raceDurationSeconds)
  savePersistedState(raceState)
  res.json({ ok: true, message: 'State has been reset' })
})

// 6. State loading + autosave
let raceState = loadPersistedState()
let shouldRestoreRaceTimer = false;
if (!raceState) {
  console.log('[STATE] No persisted state found, creating initial state')
  raceState = createInitialState(env.raceDurationSeconds)
  savePersistedState(raceState)
}
// Restore timer if race was running
if (raceState.status === 'running' && raceState.startedAt) {
  // Use millisecond precision for timer restoration
  const elapsedMs = Date.now() - raceState.startedAt;
  const durationMs = (raceState.raceDurationSeconds ?? 600) * 1000;
  raceState.timeRemainingSeconds = Math.max(0, (durationMs - elapsedMs) / 1000);
  if (raceState.timeRemainingSeconds > 0) {
    shouldRestoreRaceTimer = true;
  } else {
    raceState.status = 'finished';
    raceState.mode = 'finish';
  }
}
setInterval(() => {
  savePersistedState(raceState)
}, 2000)

// 7. Access keys
const accessKeys = buildAccessKeys(env.receptionistKey, env.safetyKey, env.observerKey)

// 8. Socket.IO setup
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: env.allowedOrigins.length === 1 && env.allowedOrigins[0] === '*' ? '*' : env.allowedOrigins,
    credentials: true,
  },
})

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`)
  console.log(`Race duration: ${env.raceDurationSeconds} seconds`)
})

// 9. Socket connection handlers
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`)

  socket.on('state:get', (callback) => {
    callback(raceState)
  })

  socket.on('auth:check', async ({ role, key }, callback) => {
    const ok = await validateAccess(role, key, accessKeys)
    if (ok) {
      socket.data.role = role;
    }
    callback({ ok, message: ok ? undefined : 'Invalid access key' })
  })

  registerSessionHandlers(io, socket, raceState)

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`)
  })
})

// --- Timer restoration after state load ---
if (shouldRestoreRaceTimer) {
  startRaceTimer(io, raceState);
}