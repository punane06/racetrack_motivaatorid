const { Server } = require("socket.io");
const raceManager = require("./raceManager");
const state = require("./state");
const { KEYS } = require("./config");

function initSocket(server) {
    const io = new Server(server, {
        cors: { origin: "*" }
    });

    io.on("connection", (socket) => {

        // =========================
        // AUTH
        // =========================
        socket.on("auth", ({ role, key }) => {
            if (KEYS[role] !== key) {
                setTimeout(() => {
                    socket.emit("auth_error");
                }, 500);
                return;
            }

            socket.join(role);
            socket.emit("auth_success", state);
        });

        // =========================
        // RECEPTIONIST
        // =========================
        socket.on("create_session", () => {
            raceManager.createSession();
            io.emit("next-session-updated", state);
        });

        socket.on("add_driver", (data) => {
            try {
                raceManager.addDriver(data.sessionId, data.name);
                io.emit("next-session-updated", state);
            } catch (e) {
                socket.emit("error", e.message);
            }
        });

        // =========================
        // SAFETY OFFICIAL
        // =========================
        socket.on("race-start", () => {
            raceManager.startRace(io);
        });

        socket.on("race-mode-change", (mode) => {
            raceManager.setMode(io, mode);
        });

        socket.on("race-finish", () => {
            raceManager.finishRace(io);
        });

        socket.on("session-end", () => {
            raceManager.endSession(io);
        });

        // =========================
        // LAP OBSERVER
        // =========================
        socket.on("lap-recorded", (car) => {
            raceManager.recordLap(io, car);
        });

    });
}

module.exports = initSocket;