import 'dotenv/config'
import { DEV_RACE_DURATION_SECONDS, PROD_RACE_DURATION_SECONDS } from '@shared/constants'

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
    throw new Error(`Missing required environment variable: ${name}`)
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
    raceDurationSeconds: process.env.RACE_DEV_MODE === 'true' ? DEV_RACE_DURATION_SECONDS : PROD_RACE_DURATION_SECONDS,
  }
}

export function printEnvUsage(): void {
  console.error('Server cannot start without access keys.')
  console.error('Set all keys and start again:')
  console.error('  RECEPTIONIST_KEY=your_key')
  console.error('  SAFETY_KEY=your_key')
  console.error('  OBSERVER_KEY=your_key')
}
