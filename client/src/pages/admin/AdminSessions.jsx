import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/date.js';
import { toastSuccess, toastError, toastConfirm } from '../../utils/toast.jsx';
import SessionFormModal from './SessionFormModal.jsx';

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [modalState, setModalState] = useState(null); // { mode: 'create' } | { mode: 'edit', session, lockedPlayerIds }

  function load() {
    api.sessions.list().then(setSessions).catch((err) => setError(err.message));
    api.players.list().then(setPlayers).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function startEdit(session) {
    try {
      const { lockedPlayerIds } = await api.sessions.lockedPlayers(session._id);
      setModalState({ mode: 'edit', session, lockedPlayerIds });
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = await toastConfirm('Delete this session? This also removes all its mini-games and stats.');
    if (!confirmed) return;
    try {
      await api.sessions.remove(id);
      toastSuccess('Session deleted');
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-primary btn-new-session" onClick={() => setModalState({ mode: 'create' })}>
        ＋ סשן חדש
      </button>

      {error && <p className="error-text">{error}</p>}

      <h2>Sessions</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Notes</th>
              <th>Roster</th>
              <th>Mini-Games</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s._id}>
                <td>{formatDate(s.date)}</td>
                <td className="truncate">{s.notes}</td>
                <td>{(s.roster || []).length}</td>
                <td>{s.miniGameCount}</td>
                <td className="table-actions">
                  <Link className="btn btn-sm btn-primary" to={`/admin/sessions/${s._id}`}>
                    Manage
                  </Link>
                  <button className="btn btn-sm" onClick={() => startEdit(s)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalState && (
        <SessionFormModal
          players={players}
          mode={modalState.mode}
          session={modalState.session}
          lockedPlayerIds={modalState.lockedPlayerIds}
          onClose={() => setModalState(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
