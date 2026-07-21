import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate } from '../utils/date.js';

export default function SessionsList() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.sessions.list(), api.games.list()])
      .then(([sessions, games]) => {
        const sessionEntries = sessions.map((s) => ({
          type: 'session',
          id: s._id,
          date: s.date,
          notes: s.notes,
          miniGameCount: s.miniGameCount,
        }));
        const legacyEntries = games.map((g) => ({
          type: 'legacy',
          id: g._id,
          date: g.date,
          notes: g.notes,
        }));
        const merged = [...sessionEntries, ...legacyEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(merged);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 className="section-title">Sessions</h1>
      {loading && <p>Loading sessions...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && entries.length === 0 && <p>No sessions yet.</p>}
      {!loading && !error && entries.length > 0 && (
        <div className="session-list">
          {entries.map((entry) => (
            <Link
              key={`${entry.type}-${entry.id}`}
              to={entry.type === 'session' ? `/sessions/${entry.id}` : `/legacy-sessions/${entry.id}`}
              className="session-card"
            >
              <div className="session-card-date">{formatDate(entry.date)}</div>
              <div className="session-card-meta">
                {entry.type === 'legacy' ? (
                  <span className="badge badge-legacy">Legacy Session</span>
                ) : (
                  <span className="badge">
                    {entry.miniGameCount} mini-game{entry.miniGameCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {entry.notes && <p className="session-card-notes">{entry.notes}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
