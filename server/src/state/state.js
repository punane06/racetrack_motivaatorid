const state = {
    sessions: [],
    currentSessionIndex: 0,

    race: {
        status: "IDLE", // IDLE | RUNNING | FINISHED | ENDED
        mode: "SAFE",   // SAFE | HAZARD | DANGER | FINISH
        startedAt: null,
        endsAt: null,
        remaining: 0
    }
};

module.exports = state;