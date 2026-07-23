import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="page-container">
      <Outlet />
    </div>
  );
}
