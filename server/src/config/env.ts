import 'dotenv/config'

export interface ServerEnv {
  port: number
  receptionistKey: string
  safetyKey: string
  observerKey: string
  raceDurationSeconds: number
  allowedOrigins: string[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`)
  }
  return value
}

export function loadEnv(): ServerEnv {
  const receptionistKey = requireEnv('RECEPTIONIST_KEY')
  const safetyKey = requireEnv('SAFETY_KEY')
  const observerKey = requireEnv('OBSERVER_KEY')
  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS || '*'
  const allowedOrigins = allowedOriginsRaw === '*' ? ['*'] : allowedOriginsRaw.split(',').map(s => s.trim()).filter(Boolean)

  return {
    port: Number(process.env.PORT ?? 3000),
    receptionistKey,
    safetyKey,
    observerKey,
    raceDurationSeconds:
      process.env.RACE_DEV_MODE === 'true' ? 60 : 600,
    allowedOrigins,
  }
}

export function printEnvUsage() {
  console.log(`
SET ENV VARIABLES:

export RECEPTIONIST_KEY=123
export SAFETY_KEY=123
export OBSERVER_KEY=123
export ALLOWED_ORIGINS=http://localhost:5173,http://prod-url
`)
}