# Racetrack Info Screens

This project is a team assignment built during the //kood course.
Team name: Motivaatorid.

The goal is to deliver an operational racetrack MVP where:

- employees have dedicated interfaces for race operations,
- the audience has dedicated display screens for live race information,
- the server is the single source of truth for race state,
- client and server share TypeScript contracts for consistency,
- race state persists across server restarts.

## Team

- Serle Tali
- Piret Maricic
- Kati-Helen Peegel
- Kadi Kerner (Team Lead)

## Tech Stack

- server: Node.js, Express, Socket.IO, TypeScript
- client: React, Vite, TypeScript
- shared: TypeScript shared types and event contracts

## Requirements

- Node.js 20+
- npm 10+

## Environment Variables

The server will not start unless all values below are provided.

Required variables:
- RECEPTIONIST_KEY
- SAFETY_KEY
- OBSERVER_KEY

Example for Linux and macOS:

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

## Installation

Run in the project root:

```bash
npm install
```

---

## Development

Start both server and client in watch mode:

```bash
npm run dev
```

This launches:

- the server (TypeScript watch mode),
- the client (Vite dev server).

---

## Production-like Run

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

## Routes

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

## Workspace Structure

- **server** — backend API, WebSocket logic, state management  
- **client** — user interfaces and route structure  
- **shared** — TypeScript contracts shared between server and client

---

## Persisted State

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

## Exposing the Application (ngrok)

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


## Notes

- Server validates access keys at startup.
- Shared contracts must remain synchronized between server and client.
- Race duration is configurable via environment variables.
- In development mode, the race timer may run shorter for testing.
