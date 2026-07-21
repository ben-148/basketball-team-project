import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="page-container">
      <h1>Admin Panel</h1>
      <div className="admin-tabs">
        <NavLink to="/admin/players" className={({ isActive }) => (isActive ? 'active' : '')}>
          Players
        </NavLink>
        <NavLink to="/admin/sessions" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sessions
        </NavLink>
        <NavLink to="/admin/videos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Videos
        </NavLink>
        <NavLink to="/admin/import" className={({ isActive }) => (isActive ? 'active' : '')}>
          Import
        </NavLink>
      </div>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
