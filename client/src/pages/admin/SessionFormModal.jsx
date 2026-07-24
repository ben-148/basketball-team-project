import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { toastSuccess, toastInfo, toastError, toastWarning } from '../../utils/toast.jsx';
import { MIN_SESSION_ROSTER_SIZE } from '../../constants.js';
import { getInitials } from '../../utils/avatar.js';

function PlayerAvatar({ player }) {
  return player.photo ? (
    <img src={player.photo} alt={player.name} />
  ) : (
    <span className="player-avatar-initials">{getInitials(player.name)}</span>
  );
}

// Used for both creating a new session and editing an existing one. In edit mode, players in
// `lockedPlayerIds` already have recorded stats in this session's mini-games and can't be
// unselected — the server enforces this too, this is just so the admin sees it up front.
export default function SessionFormModal({ players, mode, session, lockedPlayerIds = [], onClose, onSaved }) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const lockedSet = new Set(lockedPlayerIds.map(String));

  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() =>
    isEdit ? (session.roster || []).map(String) : []
  );
  const [date, setDate] = useState(() => (isEdit && session.date ? session.date.slice(0, 10) : ''));
  const [notes, setNotes] = useState(() => (isEdit ? session.notes || '' : ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingDates, setExistingDates] = useState(new Set());

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Only relevant when creating — editing a session's own date against itself isn't a conflict.
  useEffect(() => {
    if (isEdit) return;
    api.sessions
      .list()
      .then((sessions) => setExistingDates(new Set(sessions.map((s) => s.date.slice(0, 10)))))
      .catch(() => {});
  }, [isEdit]);

  const isDuplicateDate = !isEdit && date !== '' && existingDates.has(date);

  function handleDateChange(e) {
    const value = e.target.value;
    setDate(value);
    if (!isEdit && value && existingDates.has(value)) {
      toastWarning('כבר קיים סשן בתאריך זה');
    }
  }

  function togglePlayer(id) {
    if (lockedSet.has(id)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedPlayers = players.filter((p) => selectedIds.includes(p._id));
  const canContinue = isEdit || selectedIds.length >= MIN_SESSION_ROSTER_SIZE;

  async function handleSubmit() {
    if (!date) {
      setError('נא לבחור תאריך');
      return;
    }
    if (isDuplicateDate) {
      setError('כבר קיים סשן בתאריך זה');
      return;
    }
    setError('');
    setSaving(true);
    // Locked players can never be toggled off, but union defensively in case a caller ever
    // passes lockedPlayerIds that weren't already part of the initial selection.
    const roster = Array.from(new Set([...selectedIds, ...lockedSet]));
    try {
      if (isEdit) {
        await api.sessions.update(session._id, { date, notes, roster });
        toastSuccess('Session saved');
        onSaved?.();
        onClose();
      } else {
        const created = await api.sessions.create({ date, notes, roster });
        toastInfo('Session created');
        onClose();
        navigate(`/admin/sessions/${created._id}`);
      }
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-create-session" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <div key="step1" className="modal-step">
            <h2 className="modal-title">מי הגיע הערב?</h2>
            <div className="player-select-grid">
              {players.map((p) => {
                const locked = lockedSet.has(p._id);
                const selected = locked || selectedIds.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    className={`player-select-item ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                    onClick={() => togglePlayer(p._id)}
                    disabled={locked}
                    title={locked ? 'לשחקן זה יש נתונים במשחקונים הסשן' : undefined}
                  >
                    <span className="player-select-circle">
                      <PlayerAvatar player={p} />
                      {locked ? (
                        <span className="player-select-lock">🔒</span>
                      ) : selected ? (
                        <span className="player-select-check">✓</span>
                      ) : null}
                    </span>
                    <span className="player-select-name">{p.name}</span>
                  </button>
                );
              })}
            </div>
            <p className={`modal-roster-counter ${selectedIds.length >= MIN_SESSION_ROSTER_SIZE ? 'modal-roster-counter-ready' : 'modal-roster-counter-low'}`}>
              נבחרו {selectedIds.length} שחקנים (מינימום {MIN_SESSION_ROSTER_SIZE})
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                ביטול
              </button>
              <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => setStep(2)}>
                המשך ←
              </button>
            </div>
          </div>
        ) : (
          <div key="step2" className="modal-step">
            <h2 className="modal-title">פרטי הסשן</h2>
            <div className="selected-avatar-row">
              {selectedPlayers.map((p) => (
                <span key={p._id} className="selected-avatar-chip" title={p.name}>
                  <PlayerAvatar player={p} />
                </span>
              ))}
            </div>
            <div className="form">
              <label>
                תאריך
                <input type="date" value={date} onChange={handleDateChange} required />
              </label>
              {isDuplicateDate && <p className="error-text">כבר קיים סשן בתאריך זה</p>}
              <label>
                הערות (אופציונלי)
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </label>
              {error && <p className="error-text">{error}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setStep(1)}>
                ← חזרה
              </button>
              <button type="button" className="btn btn-primary" disabled={saving || isDuplicateDate} onClick={handleSubmit}>
                {saving ? 'שומר...' : isEdit ? 'שמור שינויים ✓' : 'צור סשן ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
