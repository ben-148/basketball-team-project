import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { toastSuccess, toastError, toastConfirm } from '../../utils/toast.jsx';
import AdminBackLink from '../../components/AdminBackLink.jsx';

const emptyForm = { title: '', youtubeUrl: '', description: '', player: '' };

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.videos.list().then(setVideos).catch((err) => setError(err.message));
    api.players.list().then(setPlayers).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function startEdit(video) {
    setEditingId(video._id);
    setForm({
      title: video.title,
      youtubeUrl: video.youtubeUrl,
      description: video.description || '',
      player: video.player?._id || '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, player: form.player || null };
    try {
      if (editingId) {
        await api.videos.update(editingId, payload);
        toastSuccess('Video saved');
      } else {
        await api.videos.create(payload);
        toastSuccess('Video added');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = await toastConfirm('Delete this video?');
    if (!confirmed) return;
    try {
      await api.videos.remove(id);
      toastSuccess('Video deleted');
      load();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  return (
    <div>
      <AdminBackLink />
      <h2>{editingId ? 'Edit Video' : 'Add Video'}</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label>
          YouTube URL
          <input
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <label>
          Tag to Player (optional)
          <select value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })}>
            <option value="">— None —</option>
            {players.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save Changes' : 'Add Video'}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2>Videos</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Player</th>
              <th>URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v._id}>
                <td>{v.title}</td>
                <td>{v.player?.name || '—'}</td>
                <td className="truncate">{v.youtubeUrl}</td>
                <td className="table-actions">
                  <button className="btn btn-sm" onClick={() => startEdit(v)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v._id)}>
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
