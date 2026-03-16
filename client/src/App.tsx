import { Navigate, Route, Routes } from 'react-router-dom'

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
        <Route path="/front-desk" element={<FrontDeskPage />} />
        <Route path="/race-control" element={<RaceControlPage />} />
        <Route path="/lap-line-tracker" element={<LapLineTrackerPage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/leader-board" element={<LeaderBoardPage />} />
        <Route path="/next-race" element={<NextRacePage />} />
        <Route path="/race-countdown" element={<RaceCountdownPage />} />
        <Route path="/race-flags" element={<RaceFlagsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/leader-board" replace />} />
    </Routes>
  )
}

export default App
