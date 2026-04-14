import 'dotenv/config'

export interface ServerEnv {
  port: number
  receptionistKey: string
  safetyKey: string
  observerKey: string
  raceDurationSeconds: number
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

  return {
    port: Number(process.env.PORT ?? 3000),
    receptionistKey,
    safetyKey,
    observerKey,
    raceDurationSeconds:
      process.env.RACE_DEV_MODE === 'true' ? 60 : 600
  }
}

export function printEnvUsage() {
  console.log(`
SET ENV VARIABLES:

export RECEPTIONIST_KEY=123
export SAFETY_KEY=123
export OBSERVER_KEY=123
`)
}