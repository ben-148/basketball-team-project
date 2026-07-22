import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { formatDate } from '../../utils/date.js';
import { toastSuccess, toastError, toastInfo, toastConfirm } from '../../utils/toast.jsx';

const emptyForm = { date: '', notes: '', roster: [] };
const MIN_ROSTER_SIZE = 6;

export default function AdminSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.sessions.list().then(setSessions).catch((err) => setError(err.message));
    api.players.list().then(setPlayers).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function startEdit(session) {
    setEditingId(session._id);
    setForm({
      date: session.date ? session.date.slice(0, 10) : '',
      notes: session.notes || '',
      roster: (session.roster || []).map(String),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleRosterPlayer(playerId) {
    setForm((prev) => ({
      ...prev,
      roster: prev.roster.includes(playerId)
        ? prev.roster.filter((id) => id !== playerId)
        : [...prev.roster, playerId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.sessions.update(editingId, form);
        toastSuccess('Session saved');
        resetForm();
        load();
      } else {
        const created = await api.sessions.create(form);
        toastInfo('Session created');
        resetForm();
        navigate(`/admin/sessions/${created._id}`);
      }
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = await toastConfirm('Delete this session? This also removes all its mini-games and stats.');
    if (!confirmed) return;
    try {
      await api.sessions.remove(id);
      toastSuccess('Session deleted');
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <h2>{editingId ? 'Edit Session' : 'Add Session'}</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Who showed up tonight?
          <div className="roster-checklist">
            {players.map((p) => (
              <label key={p._id} className="roster-checkbox">
                <input
                  type="checkbox"
                  checked={form.roster.includes(p._id)}
                  onChange={() => toggleRosterPlayer(p._id)}
                />
                {p.name}
              </label>
            ))}
          </div>
          <p className={`roster-counter ${form.roster.length < MIN_ROSTER_SIZE ? 'roster-counter-low' : ''}`}>
            נבחרו {form.roster.length} שחקנים (מינימום {MIN_ROSTER_SIZE})
          </p>
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label>
          Notes
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!editingId && form.roster.length < MIN_ROSTER_SIZE}
          >
            {editingId ? 'Save Changes' : 'Add Session'}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>Sessions</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Notes</th>
              <th>Roster</th>
              <th>Mini-Games</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s._id}>
                <td>{formatDate(s.date)}</td>
                <td className="truncate">{s.notes}</td>
                <td>{(s.roster || []).length}</td>
                <td>{s.miniGameCount}</td>
                <td className="table-actions">
                  <Link className="btn btn-sm btn-primary" to={`/admin/sessions/${s._id}`}>
                    Manage
                  </Link>
                  <button className="btn btn-sm" onClick={() => startEdit(s)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>
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
