import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/date.js';
import { toastSuccess, toastError, toastConfirm } from '../../utils/toast.jsx';

export default function AdminLegacySessions() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api.games.list().then(setGames).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleDelete(id) {
    const confirmed = await toastConfirm('Delete this legacy session? This also removes all its player stats.');
    if (!confirmed) return;
    try {
      await api.games.remove(id);
      toastSuccess('Legacy session deleted');
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <p className="legacy-sessions-note">
        סשנים אלו נוצרו לפני מעבר המערכת למשחקוני mini-games (כולל אלו שיובאו מ-PDF). ניתן לערוך תאריך, הערות וסטטיסטיקות שחקנים.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Notes</th>
              <th>Players</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g._id}>
                <td>{formatDate(g.date)}</td>
                <td className="truncate">{g.location}</td>
                <td className="truncate">{g.notes}</td>
                <td>{g.playerCount}</td>
                <td className="table-actions">
                  <Link className="btn btn-sm btn-primary" to={`/admin/legacy-sessions/${g._id}`}>
                    Manage
                  </Link>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
