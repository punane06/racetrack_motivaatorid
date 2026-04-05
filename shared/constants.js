export const MAX_CARS = 8;
export const PROD_RACE_DURATION_SECONDS = 10 * 60;
export const DEV_RACE_DURATION_SECONDS = 60;
export const ROUTES = {
    frontDesk: '/front-desk',
    raceControl: '/race-control',
    lapLineTracker: '/lap-line-tracker',
    leaderBoard: '/leader-board',
    nextRace: '/next-race',
    raceCountdown: '/race-countdown',
    raceFlags: '/race-flags',
};
export const PUBLIC_ROUTES = [
    ROUTES.leaderBoard,
    ROUTES.nextRace,
    ROUTES.raceCountdown,
    ROUTES.raceFlags,
];
export const EMPLOYEE_ROUTES = [
    ROUTES.frontDesk,
    ROUTES.raceControl,
    ROUTES.lapLineTracker,
];
