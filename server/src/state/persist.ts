import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const STATE_FILE = path.join(__dirname, 'state.json')

export function loadPersistedState() {
    if (!fs.existsSync(STATE_FILE)) return null
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"))
    } catch {
        return null
    }
}

export function savePersistedState(state: any) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
