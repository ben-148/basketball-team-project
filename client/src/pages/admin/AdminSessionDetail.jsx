import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/date.js';
import MiniGameStatEntry from '../../components/MiniGameStatEntry.jsx';

export default function AdminSessionDetail() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [miniGames, setMiniGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  function load() {
    api.sessions
      .get(sessionId)
      .then((data) => {
        setSession(data.session);
        setMiniGames(data.miniGames.map((m) => m.miniGame));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [sessionId]);
  useEffect(() => {
    api.players.list().then(setPlayers).catch(() => {});
  }, []);

  const rosterNames = session
    ? players.filter((p) => (session.roster || []).some((id) => String(id) === p._id)).map((p) => p.name)
    : [];

  async function handleAddMiniGame() {
    setError('');
    setAdding(true);
    try {
      await api.miniGames.create(sessionId);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <div className="page-container">Loading...</div>;
  if (error && !session) return <div className="page-container error-text">{error}</div>;
  if (!session) return null;

  return (
    <div>
      <Link to="/admin/sessions" className="back-link">
        &larr; Back to sessions
      </Link>
      <h2>{formatDate(session.date)}</h2>
      {session.notes && <p className="player-bio">{session.notes}</p>}
      {rosterNames.length > 0 && (
        <p className="session-roster-line">
          Tonight's roster ({rosterNames.length}): {rosterNames.join(', ')}
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {miniGames.map((mg, index) => (
        <MiniGameStatEntry key={mg._id} miniGame={mg} index={index} onDeleted={load} />
      ))}

      <button type="button" className="btn btn-primary" disabled={adding} onClick={handleAddMiniGame}>
        + Add Mini-Game
      </button>
    </div>
  );
}
