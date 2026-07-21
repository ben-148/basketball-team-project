import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth.js';

export default function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
