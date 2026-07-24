import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatsTable from '../components/StatsTable.jsx';
import { STAT_COLUMNS } from '../config/statConfig.js';

// Stat columns come straight from the shared config, in its order; structural columns
// (games played, bench count) are appended after — they aren't part of the stat order itself.
const COLUMNS = ['player', ...STAT_COLUMNS.map((c) => c.key), 'gamesPlayed', 'benchCount'];

export default function StatsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.players
      .leaderboard()
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 className="section-title">Stats</h1>
      {loading && <p>Loading stats...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No stats yet.</p>}
      {!loading && !error && rows.length > 0 && (
        <StatsTable
          rows={rows.map((row) => ({
            key: row.player._id,
            player: row.player,
            points: row.totals.points,
            rebounds: row.totals.rebounds,
            assists: row.totals.assists,
            steals: row.totals.steals,
            turnovers: row.totals.turnovers,
            wins: row.totals.wins,
            gamesPlayed: row.gamesPlayed,
            benchCount: row.benchCount,
            achievements: row.achievements,
          }))}
          columns={COLUMNS}
          highlightLeaders
        />
      )}
    </div>
  );
}
