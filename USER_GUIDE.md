# Racetrack System — Full User Guide

This document describes how each interface in the Racetrack Info Screens system works, how different roles interact with the system, and how the race lifecycle is managed end‑to‑end.

The guide is based on the actual implemented logic in the client and server code.

---

# 1. Personas and Interfaces

The system is used by several roles, each with a dedicated interface:

| Role | Interface | Route |
|------|-----------|--------|
| Receptionist | Front Desk | `/front-desk` |
| Safety Official | Race Control | `/race-control` |
| Lap-line Observer | Lap-line Tracker | `/lap-line-tracker` |
| Race Drivers | Next Race, Race Flags, Countdown | `/next-race`, `/race-flags`, `/race-countdown` |
| Guests | Leader Board | `/leader-board` |

All interfaces communicate with the server in real time using **Socket.IO**.  
No polling or REST calls are used for live updates.

---

# 2. Access Keys

The following interfaces require access keys:

- Front Desk
- Race Control
- Lap-line Tracker

The keys must match environment variables:

- `RECEPTIONIST_KEY`
- `SAFETY_KEY`
- `OBSERVER_KEY`

If a wrong key is entered:

- the server waits ~500ms before responding,
- the UI shows an error,
- the user is prompted again.

The server will not start unless all required keys are set.

---

# 3. Race Lifecycle Overview

A typical race flow:

1. **Receptionist** creates sessions and assigns drivers.
2. **Next Race** shows the upcoming session.
3. **Safety Official** sees the next session and presses **Start Race**.
4. The server:
   - sets the active session,
   - starts the countdown timer (1 minute in dev mode),
   - sets the race mode (usually `safe`),
   - broadcasts updates to all interfaces.
5. **Race Flags** updates to show the current flag.
6. **Lap-line Observer** records laps using large buttons.
7. **Leader Board** updates in real time.
8. Safety Official changes race mode as needed.
9. Safety Official selects **FINISH**, then **End Session**.
10. The server:
    - marks the session as finished,
    - sets mode to `danger`,
    - moves to the next upcoming session.
11. **Next Race** switches to the next session or shows **Proceed to paddock**.
12. When all sessions are done, Race Control shows **No upcoming sessions**.

---

# 4. Front Desk — Receptionist  
Route: `/front-desk`

The Front Desk is used to manage upcoming race sessions and drivers.

## 4.1 Features

- Create new sessions
- Add/edit/remove drivers
- Automatic car number assignment
- Prevent duplicate driver names
- Delete upcoming sessions
- Sessions disappear once they become active or finished

## 4.2 How it works

### Loading state
- On connect, the client requests the full `RaceState`.
- It listens to:
  - `sessions:updated`
  - `operation:error`

### Creating a session
- Enter a label → click **Add Session**
- Emits: `session:create`
- Server creates a session and broadcasts updates.

### Deleting a session
- Only possible when `status === "upcoming"`
- Emits: `session:delete`

### Managing drivers
- Add driver → `driver:add`
- Edit driver → `driver:edit`
- Remove driver → `driver:remove`
- Drivers are sorted by `carNumber`.

### Editing restrictions
- When session becomes **active** or **finished**:
  - driver editor disappears,
  - edit/remove buttons are disabled.

---

# 5. Race Control — Safety Official  
Route: `/race-control`

Race Control is designed for mobile use and controls the race lifecycle.

## 5.1 Features

- Start the next race
- Change race mode:
  - Safe (green)
  - Hazard (yellow)
  - Danger (red)
  - Finish (chequered)
- End the race session
- See next session and drivers
- See “No upcoming sessions” when done

## 5.2 How it works

### Idle with upcoming session
Shows:
- Next session label
- Driver list
- **Start Race** button (only active button)

### Starting the race
Emits: `race:start`  
Server:
- sets active session,
- sets status to `running`,
- starts countdown,
- sets mode (usually `safe`).

### Race in progress
Shows four large buttons:
- SAFE
- HAZARD
- DANGER
- FINISH

Selecting a mode emits: `race-mode-change`

### Finishing the race
When mode is `finish`:
- UI shows **Race finished**
- Button: **End Session**

Emits: `race:end_session`

### No upcoming sessions
If no more sessions exist:
- UI shows **No upcoming sessions**

---

# 6. Race Flags — Drivers  
Route: `/race-flags`

A full-screen display showing the current track flag.

## 6.1 Features

- Real-time flag updates
- Full-screen mode
- Large, clear flag label

## 6.2 Flag mapping

| Mode | Flag |
|------|------|
| safe | GREEN FLAG |
| hazard | YELLOW FLAG |
| danger | RED FLAG |
| finish | CHEQUERED FLAG |

Updates instantly when Safety Official changes mode.

---

# 7. Lap-line Tracker — Lap-line Observer  
Route: `/lap-line-tracker`

Designed for tablets with large tappable buttons.

## 7.1 Features

- One button per car
- Large tap area
- Portrait/landscape responsive layout
- Disabled buttons between races

## 7.2 How it works

### Race not running
Shows:
- “Waiting for race to start”

### Race running
Shows:
- Grid of large buttons (2 columns portrait, 4 landscape)
- Tapping a button emits: `lap-recorded`

### Race finished
- Buttons disabled
- “Race finished” message

---

# 8. Leader Board — Guests  
Route: `/leader-board`

Displays real-time race ranking.

## 8.1 Features

- Fastest lap per car
- Current lap
- Driver name + car number
- Remaining time
- Current flag mode
- Full-screen mode

## 8.2 How it works

### Selecting session
- If active session exists → show it
- Else if last finished session exists → show it
- Else → fallback message

### Sorting
Drivers are sorted by:
1. Fastest lap time (ascending)
2. Car number (tie-breaker)

### Timer
Updated via `race:tick`.

---

# 9. Next Race — Drivers  
Route: `/next-race`

Shows the upcoming session.

## 9.1 Features

- Upcoming session label
- Driver list sorted by car number
- Auto-switch to next session
- “Proceed to paddock” after race ends
- Full-screen mode

## 9.2 Proceed message

Shown when:
- `activeSessionId === null`
- `mode === "danger"`
- `lastFinishedSessionId !== null`

---

# 10. Race Countdown  
Route: `/race-countdown`

If implemented, shows:
- Remaining time
- Updates via `race:tick`
- Clear indication when race ends

---

# 11. State Persistence

The server autosaves state every 2 seconds to:

server/src/state/state.json


On restart:
- entire state is restored,
- upcoming sessions preserved,
- driver lists preserved,
- race progress preserved.

To reset:
- delete `state.json`.

---

# 12. Network Access

Interfaces can be accessed from other devices:

- Server listens on `0.0.0.0:3000`
- Client dev server can be exposed via:

ngrok http 5173
ngrok http 3000


Use the machine’s IP address to access from mobile devices.

---

# 13. Summary

This guide describes:

- all roles,
- all interfaces,
- all race lifecycle stages,
- all real-time interactions,
- access control,
- persistence,
- network access.

It reflects the actual implemented behavior of the system and can be used for testing, documentation, and onboarding.