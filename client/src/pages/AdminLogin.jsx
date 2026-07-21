import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated } from '../api/auth.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (isAuthenticated()) {
    navigate('/admin', { replace: true });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/admin', { replace: true });
    } else {
      setError('Invalid username or password.');
    }
  }

  return (
    <div className="page-container narrow">
      <h1>Admin Login</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Log In
        </button>
      </form>
    </div>
  );
}
