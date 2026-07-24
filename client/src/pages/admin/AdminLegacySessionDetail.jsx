import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { TEAMS, STAT_FIELDS } from '../../constants.js';
import { toastSuccess, toastError, toastInfo, toastConfirm } from '../../utils/toast.jsx';

// Unlike mini-games, legacy sessions have no "finish" step that auto-awards wins — wins here is
// just another raw stat field the admin edits directly, same as points/rebounds/etc.
const LEGACY_TABLE_FIELDS = STAT_FIELDS;

function teamButtonClass(team) {
  return team === TEAMS[0] ? 'team-btn-rasko' : 'team-btn-shoshanat';
}

export default function AdminLegacySessionDetail() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [form, setForm] = useState({ date: '', location: '', notes: '' });
  const [teams, setTeams] = useState({ [TEAMS[0]]: [], [TEAMS[1]]: [] });
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  function loadRoster() {
    api.legacyStats
      .forGame(gameId)
      .then((data) => {
        setTeams(data.teams);
        setUnassigned(data.unassigned);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setLoading(true);
    api.games
      .get(gameId)
      .then((g) => {
        setGame(g);
        setForm({ date: g.date.slice(0, 10), location: g.location || '', notes: g.notes || '' });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    loadRoster();
  }, [gameId]);

  async function handleSaveDetails(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await api.games.update(gameId, form);
      setGame(updated);
      toastSuccess('Session details saved');
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(playerId, team) {
    setError('');
    setBusyKey(`assign-${playerId}`);
    try {
      await api.legacyStats.assign(playerId, gameId, team);
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnassign(playerId) {
    setError('');
    setBusyKey(`unassign-${playerId}`);
    try {
      await api.legacyStats.unassign(playerId, gameId);
      toastInfo('Player removed from session');
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAdjust(playerId, team, field, delta) {
    const row = teams[team].find((r) => r.player._id === playerId);
    if (!row) return;
    const newStats = { ...row.stats, [field]: Math.max(0, row.stats[field] + delta) };

    setTeams((prev) => ({
      ...prev,
      [team]: prev[team].map((r) => (r.player._id === playerId ? { ...r, stats: newStats } : r)),
    }));

    try {
      await api.legacyStats.save(playerId, gameId, newStats);
    } catch (err) {
      toastError(err.message);
      loadRoster();
    }
  }

  async function handleDeleteGame() {
    const confirmed = await toastConfirm('Delete this legacy session and all its player stats?');
    if (!confirmed) return;
    try {
      await api.games.remove(gameId);
      toastSuccess('Legacy session deleted');
      navigate('/admin/sessions');
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  if (loading) return <div className="page-container">Loading...</div>;
  if (error && !game) return <div className="page-container error-text">{error}</div>;
  if (!game) return null;

  return (
    <div>
      <Link to="/admin/sessions" className="back-link">
        &larr; Back to sessions
      </Link>
      <h2>עריכת סשן legacy</h2>

      <form className="form" onSubmit={handleSaveDetails}>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label>
          Location
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <label>
          Notes
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'שומר...' : 'שמור פרטים'}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDeleteGame}>
            Delete Session
          </button>
        </div>
      </form>

      {unassigned.length > 0 && (
        <div className="unassigned-panel">
          <h3>Assign Players</h3>
          <div className="unassigned-list">
            {unassigned.map((p) => (
              <div key={p._id} className="unassigned-chip">
                <span>{p.name}</span>
                <div className="team-btn-group">
                  {TEAMS.map((team) => (
                    <button
                      key={team}
                      type="button"
                      className={`btn btn-sm ${teamButtonClass(team)}`}
                      disabled={busyKey === `assign-${p._id}`}
                      onClick={() => handleAssign(p._id, team)}
                    >
                      {team}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stat-entry-columns">
        {TEAMS.map((team) => (
          <div key={team} className="stat-entry-column">
            <h3 className="team-column-title">{team}</h3>
            {teams[team].length === 0 ? (
              <p className="team-column-empty">No players assigned yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="stat-entry-compact-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      {LEGACY_TABLE_FIELDS.map(([field, label]) => (
                        <th key={field}>{label}</th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams[team].map((row) => (
                      <tr key={row.player._id}>
                        <td className="stat-entry-player-cell">
                          <img
                            src={row.player.photo || 'https://placehold.co/60x60'}
                            alt={row.player.name}
                            className="stat-entry-photo-sm"
                          />
                          <span>{row.player.name}</span>
                        </td>
                        {LEGACY_TABLE_FIELDS.map(([field, label]) => {
                          const plusDelta = field === 'points' ? 2 : 1;
                          const plusLabel = field === 'points' ? '+2' : '+';
                          return (
                            <td key={field}>
                              <div className="stat-counter stat-counter-sm">
                                <button
                                  type="button"
                                  className="stat-counter-btn stat-counter-btn-sm stat-counter-minus"
                                  onClick={() => handleAdjust(row.player._id, team, field, -1)}
                                  aria-label={`Decrease ${label} for ${row.player.name}`}
                                >
                                  &minus;
                                </button>
                                <span className="stat-counter-value stat-counter-value-sm">{row.stats[field]}</span>
                                <button
                                  type="button"
                                  className={`stat-counter-btn stat-counter-btn-sm stat-counter-plus ${
                                    field === 'points' ? 'stat-counter-plus-wide-sm' : ''
                                  }`}
                                  onClick={() => handleAdjust(row.player._id, team, field, plusDelta)}
                                  aria-label={`Increase ${label} for ${row.player.name} by ${plusDelta}`}
                                >
                                  {plusLabel}
                                </button>
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          <button
                            type="button"
                            className="stat-entry-remove stat-entry-remove-sm"
                            disabled={busyKey === `unassign-${row.player._id}`}
                            onClick={() => handleUnassign(row.player._id)}
                            aria-label={`Remove ${row.player.name} from session`}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
