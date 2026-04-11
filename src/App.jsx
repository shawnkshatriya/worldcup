import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './hooks/usePlayer'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/Predictions'
import Leaderboard from './pages/Leaderboard'
import Scores from './pages/Scores'
import Stats from './pages/Stats'
import AllPredictions from './pages/AllPredictions'
import Fun from './pages/Fun'
import Admin from './pages/Admin'
import Join from './pages/Join'
import AuthCallback from './pages/AuthCallback'
import './index.css'

function AppShell() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/scores"      element={<Scores />} />
          <Route path="/stats"       element={<Stats />} />
          <Route path="/predictions/all" element={<AllPredictions />} />
          <Route path="/fun" element={<Fun />} />
          <Route path="/admin"       element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <Routes>
          <Route path="/join"          element={<Join />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*"             element={<AppShell />} />
        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  )
}
