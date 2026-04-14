import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const STATE_FILE = path.join(__dirname, 'state.json')

export function loadPersistedState() {
    if (!fs.existsSync(STATE_FILE)) return null
    try {
        const loaded = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"))
        // Migration: ensure raceDurationSeconds is present
        if (typeof loaded.raceDurationSeconds !== 'number') {
            loaded.raceDurationSeconds = 600
        }
        return loaded
    } catch {
        return null
    }
}

export function savePersistedState(state: any) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
