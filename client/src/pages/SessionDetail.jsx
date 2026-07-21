import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate } from '../utils/date.js';
import { TEAMS, BENCH, STAT_FIELDS } from '../constants.js';
import { useSortableTable } from '../hooks/useSortableTable.js';

function getSummaryValue(row, field) {
  if (field === 'name') return row.player.name;
  if (field === 'benchCount') return row.benchCount;
  return row.totals[field];
}

export default function SessionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.sessions
      .get(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const { sortedRows: sortedSummary, toggleSort, sortIndicator } = useSortableTable(
    data ? data.summary : [],
    getSummaryValue
  );

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container error-text">{error}</div>;
  if (!data) return null;

  const { session, miniGames, summary } = data;

  return (
    <div className="page-container">
      <Link to="/sessions" className="back-link">
        &larr; Back to sessions
      </Link>

      <h1 className="section-title">{formatDate(session.date)}</h1>
      {session.notes && <p className="player-bio">{session.notes}</p>}

      {miniGames.length === 0 ? (
        <p>No mini-games recorded for this session yet.</p>
      ) : (
        miniGames.map((mg, index) => (
          <section key={mg.miniGame._id} className="minigame-block">
            <div className="minigame-block-header">
              <h2 className="section-title">Mini-Game #{index + 1}</h2>
              <div className="minigame-score">
                {mg.miniGame.raskoScore} - {mg.miniGame.shoshanatScore}
              </div>
            </div>

            <div className="stat-entry-columns">
              {TEAMS.map((team) => (
                <div key={team} className="stat-entry-column">
                  <h3 className="team-column-title">{team}</h3>
                  {mg.teams[team].length === 0 ? (
                    <p className="team-column-empty">No players.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="compact-table">
                        <thead>
                          <tr>
                            <th>Player</th>
                            {STAT_FIELDS.map(([field, label]) => (
                              <th key={field}>{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mg.teams[team].map((row) => (
                            <tr key={row.player._id}>
                              <td>{row.player.name}</td>
                              {STAT_FIELDS.map(([field]) => (
                                <td key={field}>{row.stats[field]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {mg.teams[BENCH].length > 0 && (
              <div className="bench-row">
                <span className="bench-row-label">🪑 Bench</span>
                {mg.teams[BENCH].map((row) => (
                  <span key={row.player._id} className="bench-chip">
                    {row.player.name}
                  </span>
                ))}
              </div>
            )}
          </section>
        ))
      )}

      {summary.length > 0 && (
        <section>
          <h2 className="section-title">Session Summary</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggleSort('name')}>
                    Player{sortIndicator('name')}
                  </th>
                  {STAT_FIELDS.map(([field, label]) => (
                    <th key={field} className="sortable-th" onClick={() => toggleSort(field)}>
                      {label}
                      {sortIndicator(field)}
                    </th>
                  ))}
                  <th className="sortable-th" onClick={() => toggleSort('benchCount')}>
                    🪑 Bench{sortIndicator('benchCount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSummary.map((row) => (
                  <tr key={row.player._id}>
                    <td>{row.player.name}</td>
                    {STAT_FIELDS.map(([field]) => (
                      <td key={field}>{row.totals[field]}</td>
                    ))}
                    <td>{row.benchCount}</td>
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
