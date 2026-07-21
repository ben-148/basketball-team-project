import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import StatValue from '../components/StatValue.jsx';
import { STAT_FIELDS } from '../constants.js';
import { useSortableTable } from '../hooks/useSortableTable.js';

const EXTRA_COLUMNS = [
  ['gamesPlayed', 'משחקונים שוחקו'],
  ['benchCount', 'פעמים על הספסל'],
];

function getValue(row, field) {
  if (field === 'name') return row.player.name;
  if (field === 'gamesPlayed') return row.gamesPlayed;
  if (field === 'benchCount') return row.benchCount;
  return row.totals[field];
}

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

  const { sortedRows, toggleSort, sortIndicator } = useSortableTable(rows, getValue);

  return (
    <div className="page-container">
      <h1 className="section-title">Stats</h1>
      {loading && <p>Loading stats...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No stats yet.</p>}
      {!loading && !error && rows.length > 0 && (
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
                {EXTRA_COLUMNS.map(([field, label]) => (
                  <th key={field} className="sortable-th" onClick={() => toggleSort(field)}>
                    {label}
                    {sortIndicator(field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.player._id}>
                  <td>
                    <Link to={`/players/${row.player._id}`}>{row.player.name}</Link>
                  </td>
                  {STAT_FIELDS.map(([field]) => (
                    <td key={field}>
                      <StatValue value={row.totals[field]} />
                    </td>
                  ))}
                  <td>{row.gamesPlayed}</td>
                  <td>{row.benchCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
