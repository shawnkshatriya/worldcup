import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './hooks/usePlayer'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Predictions from './pages/Predictions'
import Leaderboard from './pages/Leaderboard'
import Scores from './pages/Scores'
import Stats from './pages/Stats'
import Admin from './pages/Admin'
import Join from './pages/Join'
import './index.css'

function AppShell() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/join" element={<Join />} />
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
          <Route path="/join" element={<Join />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  )
}
