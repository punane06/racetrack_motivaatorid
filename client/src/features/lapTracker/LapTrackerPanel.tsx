import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import { employeeSocket } from '@/lib/socket';
import type { RaceState } from '@shared/race';

function getActiveSession(raceState: RaceState | null) {
  return raceState?.sessions.find(s => s.id === raceState.activeSessionId) || null;
}

export function LapTrackerPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const { showToast } = useToast();


  // Fetch initial state
  useEffect(() => {
    employeeSocket.emit('state:get', (state: RaceState) => {
      setRaceState(state);
    });
  }, []);

  // Listen for updates
  useEffect(() => {
    const onState = (state: RaceState) => setRaceState(state);
    // Use a stable handler for race:tick
    const onRaceTick = () => {};
    employeeSocket.on('state:updated', onState);
    employeeSocket.on('race:tick', onRaceTick); // just to trigger rerender if needed in future
    return () => {
      employeeSocket.off('state:updated', onState);
      employeeSocket.off('race:tick', onRaceTick);
    };
  }, []);

  const activeSession = getActiveSession(raceState);
  const status = raceState?.status;

  // Responsive columns: 2 portrait, 4 landscape
  const getGridColumns = () => {
    if (globalThis.window !== undefined) {
      return globalThis.window.innerWidth > globalThis.window.innerHeight ? 4 : 2;
    }
    return 2;
  };
  const [columns, setColumns] = useState(getGridColumns());
  useEffect(() => {
    const onResize = () => setColumns(getGridColumns());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // Show toast on successful lap recording (handle array)
    const onLapRecorded = (lapData: any[]) => {
      if (Array.isArray(lapData)) {
        lapData.forEach(lap => {
          if (lap && typeof lap.carNumber === 'number') {
            showToast(`Lap recorded for car ${lap.carNumber}`, 'success');
          }
        });
      }
    };
    const onOperationError = (msg: string) => {
      showToast(msg, 'error');
    };
    employeeSocket.on('lap-recorded', onLapRecorded);
    employeeSocket.on('operation:error', onOperationError);
    return () => {
      employeeSocket.off('lap-recorded', onLapRecorded);
      employeeSocket.off('operation:error', onOperationError);
    };
  }, [showToast]);

  const handleLap = useCallback((carNumber: number) => {
    employeeSocket.emit('lap-recorded', carNumber);
  }, []);

  let content = null;
  if (!raceState) {
    content = <p role="status" aria-live="polite">Loading…</p>;
  } else if (status !== 'running' && status !== 'finished') {
    content = <p className="muted" role="status" aria-live="polite">Waiting for race to start</p>;
  } else if ((status === 'running' || (status === 'finished' && raceState?.mode === 'finish')) && activeSession) {
    content = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '1.5rem',
          marginTop: '2rem',
        }}
      >
        {activeSession.drivers.map(driver => (
          <button
            key={driver.id}
            style={{
              minHeight: '22vh',
              fontSize: '2.2rem',
              fontWeight: 700,
              borderRadius: 16,
              border: '2px solid #d4dbe5',
              background: '#f7fafc',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,24,40,0.07)',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
            onClick={() => handleLap(driver.carNumber)}
            aria-label={`Record lap for car ${driver.carNumber}`}
          >
            <span className="sr-only">Record lap for car </span>{driver.carNumber}
          </button>
        ))}
      </div>
    );
  } else if (status === 'finished' && activeSession) {
    content = (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1.5rem',
            marginTop: '2rem',
          }}
        >
          {activeSession.drivers.map(driver => (
            <button
              key={driver.id}
              style={{
                minHeight: '22vh',
                fontSize: '2.2rem',
                fontWeight: 700,
                borderRadius: 16,
                border: '2px solid #d4dbe5',
                background: '#f7fafc',
                opacity: 0.4,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              disabled
            >
              Car {driver.carNumber}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 24 }} role="status" aria-live="polite">Race finished</p>
      </>
    );
  } else if (raceState?.status === 'idle' && !raceState?.activeSessionId) {
    content = <p className="muted" role="status" aria-live="polite">Session ended</p>;
  }

  return (
    <section className="panel">
      <h2 id="laptracker-heading">Lap-line Tracker</h2>
      {content}
    </section>
  );
}

          // If you add a fullscreen button here in the future, add:
          // <button ... aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}>...</button>
