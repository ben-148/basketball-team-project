import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatsTable from '../components/StatsTable.jsx';
import { formatDate } from '../utils/date.js';
import { RAW_STAT_KEYS, getStatColumn } from '../config/statConfig.js';

const COLUMNS = ['player', 'points', 'assists', 'rebounds', 'steals', 'turnovers', 'wins'];

export default function LegacySessionDetail() {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.games.get(id), api.legacyStats.forGame(id), api.pendingPlayers.forGame(id)])
      .then(([g, roster, pending]) => {
        setGame(g);
        const allRows = Object.values(roster.teams).flat();
        setPlayers(allRows);
        setGuests(pending);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container error-text">{error}</div>;
  if (!game) return null;

  const rows = players.map((row) => ({
    key: row.player._id,
    player: row.player,
    points: row.stats.points,
    rebounds: row.stats.rebounds,
    assists: row.stats.assists,
    steals: row.stats.steals,
    turnovers: row.stats.turnovers,
    wins: row.stats.wins,
  }));

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
        <StatsTable rows={rows} columns={COLUMNS} highlightLeaders />
      </section>

      {guests.length > 0 && (
        <section className="legacy-guests-section">
          <h2 className="section-title">👤 אורחים</h2>
          <p className="legacy-guests-note">
            שחקנים חד-פעמיים שאינם חלק מהרוסטר הקבוע — לא נכללים בטבלת השחקנים, בליגה או בסטטיסטיקות
            הקריירה.
          </p>
          <div className="table-wrap">
            <table className="legacy-guests-table">
              <thead>
                <tr>
                  <th>שם</th>
                  {RAW_STAT_KEYS.map((key) => (
                    <th key={key}>{getStatColumn(key).label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g._id} className="legacy-guest-row">
                    <td>👤 {g.nameInFile}</td>
                    {RAW_STAT_KEYS.map((key) => (
                      <td key={key}>{g[key] ?? 'N/A'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
