import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate } from '../utils/date.js';
import { STAT_FIELDS } from '../constants.js';

export default function LegacySessionDetail() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.games.get(id), api.legacyStats.forGame(id)])
      .then(([g, roster]) => {
        setGame(g);
        const allRows = Object.values(roster.teams).flat();
        setPlayers(allRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container error-text">{error}</div>;
  if (!game) return null;

  return (
    <div className="page-container">
      <Link to="/sessions" className="back-link">
        &larr; Back to sessions
      </Link>

      <h1 className="section-title">
        {formatDate(game.date)} <span className="badge badge-legacy">Legacy Session</span>
      </h1>
      {game.location && <p className="player-hero-meta">{game.location}</p>}
      {game.notes && <p className="player-bio">{game.notes}</p>}

      <section>
        <p className="team-column-empty">
          This session predates mini-game tracking, so it has no mini-game breakdown.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                {STAT_FIELDS.map(([field, label]) => (
                  <th key={field}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((row) => (
                <tr key={row.player._id}>
                  <td>{row.player.name}</td>
                  <td>N/A</td>
                  {STAT_FIELDS.map(([field]) => (
                    <td key={field}>{row.stats[field]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
