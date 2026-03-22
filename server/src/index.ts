import cors from 'cors'
import express from 'express'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

import { EMPLOYEE_ROUTES, PUBLIC_ROUTES } from '@shared/constants'
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events'
import { loadEnv, printEnvUsage } from './config/env.js'
import { validateAccess, buildAccessKeys } from './socket/auth.js'
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

io.on('connection', (socket) => {
  socket.on('auth:check', async (payload, callback) => {
    const ok = await validateAccess(payload.role, payload.key, accessKeys)
    callback(ok ? { ok: true } : { ok: false, message: 'Invalid access key.' })
  })

  socket.on('state:get', (callback) => {
    callback(raceState)
  })
})

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`)
  console.log(`Race duration: ${env.raceDurationSeconds} seconds`)
})
