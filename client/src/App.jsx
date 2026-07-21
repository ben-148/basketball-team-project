import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';
import PlayerPage from './pages/PlayerPage.jsx';
import SessionsList from './pages/SessionsList.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import LegacySessionDetail from './pages/LegacySessionDetail.jsx';
import StatsPage from './pages/StatsPage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import AdminPlayers from './pages/admin/AdminPlayers.jsx';
import AdminSessions from './pages/admin/AdminSessions.jsx';
import AdminSessionDetail from './pages/admin/AdminSessionDetail.jsx';
import AdminVideos from './pages/admin/AdminVideos.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players/:id" element={<PlayerPage />} />
        <Route path="/sessions" element={<SessionsList />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/legacy-sessions/:id" element={<LegacySessionDetail />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminPlayers />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="sessions/:sessionId" element={<AdminSessionDetail />} />
          <Route path="videos" element={<AdminVideos />} />
        </Route>
      </Routes>
    </>
  );
}
