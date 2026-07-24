import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { TEAMS, STAT_FIELDS } from '../../constants.js';
import { toastSuccess, toastError, toastInfo, toastConfirm } from '../../utils/toast.jsx';

// Legacy games predate the two-team mini-game structure — every assigned player is stored under
// a team internally (schema requirement), but the admin never chooses one: everyone lands on
// TEAMS[0] and the UI shows one flat roster, not team columns.
const DEFAULT_TEAM = TEAMS[0];

export default function AdminLegacySessionDetail() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [form, setForm] = useState({ date: '', location: '', notes: '' });
  const [roster, setRoster] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [players, setPlayers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [guestAssignSelections, setGuestAssignSelections] = useState({});
  const [guestNewNames, setGuestNewNames] = useState({});
  const [guestBusyId, setGuestBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  function loadRoster() {
    api.legacyStats
      .forGame(gameId)
      .then((data) => {
        const flat = Object.values(data.teams).flat().sort((a, b) => b.stats.points - a.stats.points);
        setRoster(flat);
        setUnassigned(data.unassigned);
      })
      .catch((err) => setError(err.message));
  }

  function loadGuests() {
    api.pendingPlayers.forGame(gameId).then(setGuests).catch(() => {});
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
    loadGuests();
    api.players.list().then(setPlayers).catch(() => {});
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

  async function handleAddPlayer(playerId) {
    setError('');
    setBusyKey(`assign-${playerId}`);
    try {
      await api.legacyStats.assign(playerId, gameId, DEFAULT_TEAM);
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemovePlayer(playerId) {
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

  function handleStatInput(playerId, field, value) {
    const num = Math.max(0, Number(value) || 0);
    setRoster((prev) =>
      prev.map((r) => (r.player._id === playerId ? { ...r, stats: { ...r.stats, [field]: num } } : r))
    );
  }

  async function handleStatBlur(playerId) {
    const row = roster.find((r) => r.player._id === playerId);
    if (!row) return;
    try {
      await api.legacyStats.save(playerId, gameId, row.stats);
    } catch (err) {
      toastError(err.message);
      loadRoster();
    }
  }

  async function handleAssignGuest(guestId) {
    const playerId = guestAssignSelections[guestId];
    if (!playerId) {
      toastError('נא לבחור שחקן');
      return;
    }
    setGuestBusyId(guestId);
    try {
      await api.pendingPlayers.assign(guestId, playerId);
      toastSuccess('שחקן שויך בהצלחה');
      setGuests((prev) => prev.filter((g) => g._id !== guestId));
      loadRoster();
    } catch (err) {
      toastError(err.message);
    } finally {
      setGuestBusyId(null);
    }
  }

  async function handleCreateGuestPlayer(guestId, defaultName) {
    const name = (guestNewNames[guestId] ?? defaultName).trim();
    if (!name) {
      toastError('נא להזין שם');
      return;
    }
    setGuestBusyId(guestId);
    try {
      const result = await api.pendingPlayers.createAndAssign(guestId, name);
      toastSuccess(`שחקן "${result.player.name}" נוצר ושויך`);
      setGuests((prev) => prev.filter((g) => g._id !== guestId));
      setPlayers((prev) => [...prev, result.player].sort((a, b) => a.name.localeCompare(b.name)));
      loadRoster();
    } catch (err) {
      toastError(err.message);
    } finally {
      setGuestBusyId(null);
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

      <h3 className="section-title">שחקנים</h3>

      {roster.length === 0 ? (
        <p className="team-column-empty">No players assigned yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="stat-entry-compact-table">
            <thead>
              <tr>
                <th>Player</th>
                {STAT_FIELDS.map(([field, label]) => (
                  <th key={field}>{label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <tr key={row.player._id}>
                  <td className="stat-entry-player-cell">
                    <img
                      src={row.player.photo || 'https://placehold.co/60x60'}
                      alt={row.player.name}
                      className="stat-entry-photo-sm"
                    />
                    <span>{row.player.name}</span>
                  </td>
                  {STAT_FIELDS.map(([field]) => (
                    <td key={field}>
                      <input
                        type="number"
                        min="0"
                        className="import-stat-input"
                        value={row.stats[field] ?? 0}
                        onChange={(e) => handleStatInput(row.player._id, field, e.target.value)}
                        onBlur={() => handleStatBlur(row.player._id)}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="stat-entry-remove stat-entry-remove-sm"
                      disabled={busyKey === `unassign-${row.player._id}`}
                      onClick={() => handleRemovePlayer(row.player._id)}
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

      {unassigned.length > 0 && (
        <div className="unassigned-panel">
          <h3>הוסף שחקן</h3>
          <div className="unassigned-list">
            {unassigned.map((p) => (
              <div key={p._id} className="unassigned-chip">
                <span>{p.name}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={busyKey === `assign-${p._id}`}
                  onClick={() => handleAddPlayer(p._id)}
                >
                  הוסף +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {guests.length > 0 && (
        <section className="pending-players-section">
          <h3 className="section-title">👤 אורחים</h3>
          <p className="legacy-guests-note">
            שחקנים מהקובץ שלא זוהו כפרופיל קיים. אפשר לשייך אותם לשחקן קיים, ליצור עבורם פרופיל, או להשאיר
            אותם כאורחים — הם לא נכללים בטבלת השחקנים, בליגה או בסטטיסטיקות הקריירה.
          </p>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>שם בקובץ</th>
                  {STAT_FIELDS.map(([field, label]) => (
                    <th key={field}>{label}</th>
                  ))}
                  <th>שייך לשחקן קיים</th>
                  <th>או צור שחקן חדש</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g._id}>
                    <td>{g.nameInFile}</td>
                    {STAT_FIELDS.map(([field]) => (
                      <td key={field}>{g[field] ?? 'N/A'}</td>
                    ))}
                    <td>
                      <div className="unmatched-row-actions">
                        <select
                          value={guestAssignSelections[g._id] || ''}
                          onChange={(e) =>
                            setGuestAssignSelections((prev) => ({ ...prev, [g._id]: e.target.value }))
                          }
                        >
                          <option value="">בחר שחקן</option>
                          {players.map((pl) => (
                            <option key={pl._id} value={pl._id}>
                              {pl.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={guestBusyId === g._id}
                          onClick={() => handleAssignGuest(g._id)}
                        >
                          שייך לשחקן קיים
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="new-player-inline">
                        <input
                          type="text"
                          value={guestNewNames[g._id] ?? g.nameInFile}
                          onChange={(e) =>
                            setGuestNewNames((prev) => ({ ...prev, [g._id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={guestBusyId === g._id}
                          onClick={() => handleCreateGuestPlayer(g._id, g.nameInFile)}
                        >
                          צור שחקן חדש ✓
                        </button>
                      </div>
                    </td>
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
