# Racetrack Info Screens

This project is a team assignment built during the //kood course.  
Team name: **Motivaatorid**.

The goal is to deliver an operational racetrack MVP where:

- employees have dedicated interfaces for race operations,
- the audience has dedicated display screens for live race information,
- the server is the single source of truth for race state,
- client and server share TypeScript contracts for consistency,
- race state persists across server restarts.

---

## Team

- Serle Tali  
- Piret Maricic  
- Kati-Helen Peegel  
- Kadi Kerner (Team Lead)

---

# 1. Tech Stack

- **Server:** Node.js, Express, Socket.IO, TypeScript  
- **Client:** React, Vite, TypeScript  
- **Shared:** TypeScript shared types and event contracts  
- **State persistence:** JSON autosave

---

# 2. Requirements

- Node.js 20+  
- npm 10+

---

# 3. Environment Variables

The server will not start unless all required access keys are provided.

Required variables:

- `RECEPTIONIST_KEY`
- `SAFETY_KEY`
- `OBSERVER_KEY`

Example for Linux/macOS:

```bash
export RECEPTIONIST_KEY=your_key
export SAFETY_KEY=your_key
export OBSERVER_KEY=your_key
```

Example for Windows PowerShell:

```powershell
$env:RECEPTIONIST_KEY="your_key"
$env:SAFETY_KEY="your_key"
$env:OBSERVER_KEY="your_key"
```

If any variable is missing, the server exits with an error and prints usage instructions.

---

# 4. Installation

Install all dependencies:

```bash
npm install
```


# 5. Development

Start both server and client in watch mode:

```bash
npm run dev
```

This launches:

- the server (TypeScript watch mode),
- the client (Vite dev server).

---

# 6. Production-like Run

Build all workspaces:

```bash
npm run build
```

Start the server:

```bash
npm start
```

The client is served from the built `dist` folder.

---

# 7. Routes

### Employee interfaces

- `/front-desk`
- `/race-control`
- `/lap-line-tracker`

### Public screens

- `/leader-board`
- `/next-race`
- `/race-countdown`
- `/race-flags`

---

# 8. Workspace Structure

- **server** — backend API, WebSocket logic, state management  
- **client** — user interfaces and route structure  
- **shared** — TypeScript contracts shared between server and client

---

# 9. Race State Structure

The server maintains a single in-memory race state object, which is also persisted to disk.  
This object is the single source of truth for all race-related data.

## RaceState fields

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `"danger" \| "safe"` | Current track safety mode. Controls flag screens. |
| `activeSessionId` | `string \| null` | ID of the session currently running. |
| `upcomingSessionId` | `string \| null` | ID of the next scheduled session. |
| `sessions` | `Session[]` | List of all created sessions. |
| `timeRemainingSeconds` | `number` | Countdown timer for the active session. |
| `startedAt` | `number \| null` | Timestamp when the current session started. |

---

## Session structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique session identifier. |
| `label` | `string` | Human-readable session name. |
| `drivers` | `Driver[]` | List of drivers assigned to this session. |

---

## Driver structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique driver identifier. |
| `name` | `string` | Driver’s display name. |

---

## State lifecycle

- On server start:  
  - If `state.json` exists → load it  
  - Otherwise → create initial state

- During runtime:  
  - All state mutations happen through Socket.IO handlers  
  - Autosave writes the updated state to disk every 2 seconds

- On server restart:  
  - The exact previous state is restored  
  - No data is lost unless `state.json` is deleted manually

---

# 10. Socket.IO Events

## Client → Server events

| Event | Payload | Description |
|-------|---------|-------------|
| `driver:add` | `{ sessionId, name }` | Adds a new driver to a session. |
| `driver:edit` | `{ sessionId, driverId, name }` | Edits an existing driver. |
| `driver:remove` | `{ sessionId, driverId }` | Removes a driver from a session. |
| `session:create` | `label: string` | Creates a new session. |
| `session:delete` | `sessionId: string` | Deletes a session. |

---

## Server → Client events

| Event | Payload | Description |
|-------|---------|-------------|
| `sessions:updated` | `Session[]` | Broadcasts updated session list. |
| `operation:error` | `string` | Sends an error message to the client. |

---

# 11. Architecture Overview

The system follows a simple but robust architecture:

### **1. Shared Types**
- All event contracts and state types live in `/shared`
- Ensures server and client always agree on data formats

### **2. Server**
- Maintains the single source of truth (`RaceState`)
- Handles all state mutations via Socket.IO
- Autosaves state to disk
- Restores state on startup

### **3. Client**
- Connects via Socket.IO
- Reactively updates UI based on server events
- Never stores long-term state locally

### **4. Persistence**
- JSON file (`state.json`) stores the entire race state
- Autosave interval: 2 seconds
- Safe to restart server without losing data

---

# 12. Persisted State

The server supports persistent race state storage.

- State is stored in:  
  `server/src/state/state.json`
- The file is created automatically on first write.
- All changes to sessions, drivers and race state are autosaved every 2 seconds.
- On server restart, the previous state is restored.

This ensures that:

- upcoming sessions are preserved,
- driver lists and edits are not lost,
- race progress survives accidental restarts,
- the system behaves consistently across sessions.

To reset the system, delete the `state.json` file.

---

# 13. Development Workflow

### Branching

- `main` — stable, deployable  
- feature branches — one per task  
- naming convention:  
  `feature/<name>` or `<yourname>/<task>`

### Typical flow

1. Create a branch  
2. Make changes  
3. Commit with clear messages  
4. Push  
5. Open a Pull Request  
6. Request review  
7. Merge when approved

---

# 14. Exposing the Application (ngrok)

To make the interfaces available on other devices or networks:

1. Install ngrok  
2. Expose the client:

   ```bash
   ngrok http 5173
   ```

3. Expose the server:

   ```bash
   ngrok http 3000
   ```

Use the generated URLs to access the system externally.

---

# 15. FAQ

### **How do I reset the system?**
Delete `server/src/state/state.json`.

### **Why does the server refuse to start?**
One or more required environment variables are missing.

### **Why do I not see updated sessions?**
Check that the server is emitting `sessions:updated` and the client is listening.

### **Why is the countdown not running?**
`activeSessionId` may be null or `startedAt` not set.

---

# 16. Notes

- Server validates access keys at startup.
- Shared contracts must remain synchronized between server and client.
- Race duration is configurable via environment variables.
- In development mode, the race timer may run shorter for testing.

## Running frontend tests

1. Install dependencies (only needed once):

  npm install --prefix client

2. Run all tests:

  npm run --prefix client test

This will automatically run the tests in the correct (client) folder using the jsdom environment. Tests are located in `client/src/__tests__/*.test.tsx`.

