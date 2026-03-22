import { Navigate, Route, Routes } from 'react-router-dom'

import { ROUTES } from '@shared/constants'
import { EmployeeLayout } from '@/layouts/EmployeeLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { FrontDeskPage } from '@/routes/FrontDeskPage'
import { RaceControlPage } from '@/routes/RaceControlPage'
import { LapLineTrackerPage } from '@/routes/LapLineTrackerPage'
import { LeaderBoardPage } from '@/routes/LeaderBoardPage'
import { NextRacePage } from '@/routes/NextRacePage'
import { RaceCountdownPage } from '@/routes/RaceCountdownPage'
import { RaceFlagsPage } from '@/routes/RaceFlagsPage'

function App() {
  return (
    <Routes>
      <Route element={<EmployeeLayout />}>
        <Route path={ROUTES.frontDesk} element={<FrontDeskPage />} />
        <Route path={ROUTES.raceControl} element={<RaceControlPage />} />
        <Route path={ROUTES.lapLineTracker} element={<LapLineTrackerPage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path={ROUTES.leaderBoard} element={<LeaderBoardPage />} />
        <Route path={ROUTES.nextRace} element={<NextRacePage />} />
        <Route path={ROUTES.raceCountdown} element={<RaceCountdownPage />} />
        <Route path={ROUTES.raceFlags} element={<RaceFlagsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.leaderBoard} replace />} />
    </Routes>
  )
}

export default App
