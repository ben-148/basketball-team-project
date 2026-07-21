import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { toastSuccess, toastError, toastConfirm } from '../../utils/toast.jsx';

const emptyForm = { name: '', age: '', dateOfBirth: '', photo: '', bio: '' };

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.players.list().then(setPlayers).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function startEdit(player) {
    setEditingId(player._id);
    setForm({
      name: player.name,
      age: player.age,
      dateOfBirth: player.dateOfBirth ? player.dateOfBirth.slice(0, 10) : '',
      photo: player.photo || '',
      bio: player.bio || '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, age: form.age === '' ? null : Number(form.age) };
    try {
      if (editingId) {
        await api.players.update(editingId, payload);
        toastSuccess('Player saved');
      } else {
        await api.players.create(payload);
        toastSuccess('Player added');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = await toastConfirm('Delete this player? This also removes their stats.');
    if (!confirmed) return;
    try {
      await api.players.remove(id);
      toastSuccess('Player deleted');
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <h2>{editingId ? 'Edit Player' : 'Add Player'}</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Age
          <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        </label>
        <label>
          Date of Birth
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
        </label>
        <label>
          Photo URL
          <input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
        </label>
        <label>
          Bio
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save Changes' : 'Add Player'}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>Players</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Age</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td>
                  <img className="admin-thumb" src={p.photo || 'https://placehold.co/60x60'} alt={p.name} />
                </td>
                <td>{p.name}</td>
                <td>{p.age}</td>
                <td className="table-actions">
                  <button className="btn btn-sm" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p._id)}>
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
