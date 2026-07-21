import { NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from '../api/auth.js';

export default function Navbar() {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand" end>
        <span className="navbar-logo">🏀</span> Rasko Ball
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/sessions" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sessions
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>
          Stats
        </NavLink>
        {authed ? (
          <>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
            <button className="link-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/admin/login" className={({ isActive }) => (isActive ? 'active' : '')}>
            Admin
          </NavLink>
        )}
      </div>
    </nav>
  );
}
