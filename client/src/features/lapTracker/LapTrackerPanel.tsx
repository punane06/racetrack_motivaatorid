
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import { employeeSocket } from '@/lib/socket';
import type { RaceState } from '@shared/race';

// Helper to format time as mm:ss
function formatTime(seconds: number | undefined) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getActiveSession(raceState: RaceState | null) {
  return raceState?.sessions.find(s => s.id === raceState.activeSessionId) || null;
}


export function LapTrackerPanel() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const { showToast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen event listener
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  };

  // Unified effect: fetch initial state, listen for connect and state updates
  useEffect(() => {
    const fetchState = () => {
      employeeSocket.emit('state:get', (state: RaceState) => {
        setRaceState(state);
      });
    };
    const onState = (state: RaceState) => setRaceState(state);
    const onRaceTick = () => {};
    employeeSocket.on('connect', fetchState);
    employeeSocket.on('state:updated', onState);
    employeeSocket.on('race:tick', onRaceTick);
    if (employeeSocket.connected) fetchState();
    return () => {
      employeeSocket.off('connect', fetchState);
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

  const isRaceActive = raceState?.status === 'running' && (raceState?.timeRemainingSeconds ?? 1) > 0;
  const handleLap = useCallback((carNumber: number) => {
    if (!isRaceActive) return;
    employeeSocket.emit('lap-recorded', carNumber);
  }, [isRaceActive]);

  let content = null;
  if (!raceState) {
    content = <p role="status" aria-live="polite">Loading…</p>;
  } else if (raceState.status === 'idle' && raceState.lastFinishedSessionId !== null) {
    content = <p className="muted" role="status" aria-live="polite">Race session ended</p>;
  } else if (raceState.status === 'idle') {
    content = <p className="muted" role="status" aria-live="polite">Waiting for race to start</p>;
  } else if (activeSession && (status === 'running' || status === 'finished')) {
    const isDisabled = status === 'finished' || (status === 'running' && (raceState.timeRemainingSeconds ?? 1) <= 0);
    content = (
      <>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 600 }} aria-label="Time remaining">
            Time left: {formatTime(raceState?.timeRemainingSeconds)}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1.5rem',
            marginTop: '2rem',
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {activeSession.drivers.map(driver => (
            <button
              type="button"
              key={driver.id}
              style={{
                minHeight: '22vh',
                fontSize: '2.2rem',
                fontWeight: 700,
                borderRadius: 16,
                border: '2px solid #d4dbe5',
                background: '#f7fafc',
                opacity: isDisabled ? 0.4 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(16,24,40,0.07)',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              onClick={() => !isDisabled && handleLap(driver.carNumber)}
              aria-label={`Record lap for car ${driver.carNumber}`}
              disabled={isDisabled}
            >
              <span className="sr-only">Record lap for car </span>{driver.carNumber}
            </button>
          ))}
        </div>
        {isDisabled && (
          <p className="muted" style={{ marginTop: 24 }} role="status" aria-live="polite">Race finished</p>
        )}
      </>
    );
  }

  return (
    <section className="panel">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id="laptracker-heading" style={{ margin: 0 }}>Lap-line Tracker</h2>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
          style={{
            padding: '0.5rem 1.2rem',
            fontSize: '1rem',
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 12,
          }}
        >
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </header>
      {content}
    </section>
  );
}

          // If you add a fullscreen button here in the future, add:
          // <button ... aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}>...</button>
