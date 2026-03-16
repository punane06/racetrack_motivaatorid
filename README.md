# Racetrack Info Screens

This project is a team assignment built during the //kood course.
Team name: Motivaatorid.

The goal is to deliver an operational racetrack MVP where:

- employees have dedicated interfaces for race operations,
- the audience has dedicated display screens for live race information,
- the server is the single source of truth for race state,
- client and server share TypeScript contracts for consistency.

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

The server will not start unless all values below are provided:

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

## Installation

Run in the project root:

```bash
npm install
```

## Run

Development mode:

```bash
npm run dev
```

This starts both:

- server in watch mode,
- client Vite dev server.

Build + start (production-like flow):

```bash
npm run build
npm start
```

## Routes

Employee routes:

- /front-desk
- /race-control
- /lap-line-tracker

Public routes:

- /leader-board
- /next-race
- /race-countdown
- /race-flags

## Workspace Structure

- server: backend API and WebSocket logic
- client: user interfaces and route structure
- shared: contracts shared between server and client

## Notes

- Server validates access keys at startup.
- The shared module must stay synchronized with both server and client.
- Current state is an MVP skeleton; race logic is added iteratively.
