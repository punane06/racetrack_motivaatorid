import fs from "fs"
import path from "path"

const STATE_FILE = path.join(__dirname, "state.json")

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
