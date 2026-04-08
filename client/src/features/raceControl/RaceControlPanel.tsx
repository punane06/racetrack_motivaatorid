import { useEffect, useState } from 'react';
import { appSocket } from '../../lib/socket';
import type { RaceState, RaceMode } from '@shared/race';

const MODE_COLORS: Record<RaceMode, string> = {
  safe: '#2ecc40', // green
  hazard: '#ffd600', // yellow
  danger: '#ff4136', // red
  finish: '#222', // black
};

export function RaceControlPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);

  useEffect(() => {
    const onStateUpdated = (state: RaceState) => setRaceState(state);
    appSocket.on('state:updated', onStateUpdated);
    appSocket.on('race:tick', () => {});
    appSocket.emit('state:get', (state) => setRaceState(state));
    return () => {
      appSocket.off('state:updated', onStateUpdated);
      appSocket.off('race:tick', () => {});
    };
  }, []);

  const startRace = () => appSocket.emit('race:start');
  const endSession = () => appSocket.emit('race:end_session');
  const changeMode = (mode: RaceMode) => appSocket.emit('race:mode_change', mode);

  // Helper: get upcoming session
  const upcomingSession = raceState?.upcomingSessionId
    ? raceState.sessions.find(s => s.id === raceState.upcomingSessionId)
    : null;

  // Helper: get active session
  const activeSession = raceState?.activeSessionId
    ? raceState.sessions.find(s => s.id === raceState.activeSessionId)
    : null;

  // --- UI by phase ---
  let content = null;
  if (!raceState) {
    content = <p>Loading…</p>;
  } else if (raceState.status === 'idle' && raceState.upcomingSessionId && upcomingSession) {
    // 1. Next session ready
    content = (
      <>
        <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 12 }}>
          Next session: {upcomingSession.label}
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', marginBottom: 18 }}>
          {upcomingSession.drivers.map(driver => (
            <li key={driver.id} style={{ fontSize: '1.1rem', marginBottom: 4 }}>
              🚗 Car {driver.carNumber} — {driver.name}
            </li>
          ))}
        </ul>
        <button
          style={{
            width: '100%',
            padding: '1.2rem 0',
            fontSize: '1.5rem',
            fontWeight: 700,
            background: '#2ecc40',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            marginTop: 8,
            cursor: 'pointer',
          }}
          onClick={startRace}
        >
          Start Race
        </button>
      </>
    );
  } else if (raceState.status === 'running' && activeSession) {
    // 2. Race in progress
    content = (
      <>
        <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 18 }}>Race in progress</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['safe', 'hazard', 'danger', 'finish'] as RaceMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => changeMode(mode)}
              style={{
                flex: '1 1 40%',
                minWidth: 90,
                padding: '1.1rem 0.5rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 12,
                border: raceState.mode === mode ? `3px solid #222` : '2px solid #d4dbe5',
                background: MODE_COLORS[mode],
                color: mode === 'hazard' ? '#222' : '#fff',
                opacity: raceState.mode === mode ? 1 : 0.85,
                boxShadow: raceState.mode === mode ? '0 2px 8px rgba(16,24,40,0.13)' : 'none',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </>
    );
  } else if (raceState.status === 'finished' && activeSession) {
    // 3. Race finished
    content = (
      <>
        <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 18 }}>Race finished</div>
        <button
          style={{
            width: '100%',
            padding: '1.2rem 0',
            fontSize: '1.5rem',
            fontWeight: 700,
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            marginTop: 8,
            cursor: 'pointer',
          }}
          onClick={endSession}
        >
          End Session
        </button>
      </>
    );
  } else if (raceState.status === 'idle' && !raceState.upcomingSessionId) {
    // 4. No upcoming sessions
    content = <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>No upcoming sessions</div>;
  }

  return (
    <section className="panel">
      <h2>Race Control</h2>
      {content}
    </section>
  );
}
