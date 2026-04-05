const state = require("./state");
const { RACE_DURATION } = require("./config");

let timerInterval = null;

// =========================
// SESSION MANAGEMENT
// =========================
function createSession() {
    const session = {
        id: Date.now(),
        drivers: [],
        laps: {},
        lapTimes: {},
        fastestLap: {}
    };

    state.sessions.push(session);
    return session;
}

function getCurrentSession() {
    return state.sessions[state.currentSessionIndex];
}

function addDriver(sessionId, name) {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (session.drivers.find(d => d.name === name)) {
        throw new Error("Driver name must be unique");
    }

    const carNumber = session.drivers.length + 1;

    const driver = {
        name,
        car: carNumber
    };

    session.drivers.push(driver);
    session.laps[carNumber] = 0;
    session.lapTimes[carNumber] = [];
    session.fastestLap[carNumber] = null;
}

// =========================
// RACE CONTROL
// =========================
function startRace(io) {
    if (state.race.status === "RUNNING") return;

    state.race.status = "RUNNING";
    state.race.mode = "SAFE";

    const now = Date.now();
    state.race.startedAt = now;
    state.race.endsAt = now + RACE_DURATION * 1000;
    state.race.remaining = RACE_DURATION;

    startTimer(io);

    io.emit("race-start", buildPayload());
}

function startTimer(io) {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(
            0,
            Math.floor((state.race.endsAt - now) / 1000)
        );

        state.race.remaining = remaining;

        io.emit("race-timer", { remaining });

        if (remaining <= 0) {
            finishRace(io);
        }
    }, 1000);
}

function setMode(io, mode) {
    if (state.race.status !== "RUNNING") return;
    if (state.race.mode === "FINISH") return;

    state.race.mode = mode;

    io.emit("race-mode-change", { mode });
}

function finishRace(io) {
    if (state.race.status !== "RUNNING") return;

    clearInterval(timerInterval);

    state.race.status = "FINISHED";
    state.race.mode = "FINISH";

    io.emit("race-finished", buildPayload());
}

function endSession(io) {
    if (state.race.status !== "FINISHED") return;

    state.race.status = "ENDED";
    state.race.mode = "DANGER";

    state.currentSessionIndex++;

    io.emit("next-session-updated", buildPayload());
}

// =========================
// LAP TRACKING
// =========================
function recordLap(io, carNumber) {
    if (state.race.status === "ENDED") return;

    const session = getCurrentSession();
    if (!session) return;

    const now = Date.now();

    const lapList = session.lapTimes[carNumber];
    const lastLapTime = lapList.length
        ? lapList[lapList.length - 1].timestamp
        : state.race.startedAt;

    const lapTime = (now - lastLapTime) / 1000;

    session.laps[carNumber]++;
    lapList.push({
        time: lapTime,
        timestamp: now
    });

    if (
        !session.fastestLap[carNumber] ||
        lapTime < session.fastestLap[carNumber]
    ) {
        session.fastestLap[carNumber] = lapTime;
    }

    io.emit("lap-recorded", {
        car: carNumber,
        lap: session.laps[carNumber],
        fastest: session.fastestLap[carNumber]
    });
}

// =========================
// HELPERS
// =========================
function buildPayload() {
    const session = getCurrentSession();

    return {
        race: state.race,
        session
    };
}

module.exports = {
    createSession,
    addDriver,
    startRace,
    setMode,
    finishRace,
    endSession,
    recordLap,
    getCurrentSession
};