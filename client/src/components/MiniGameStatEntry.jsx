import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { TEAMS, BENCH, STAT_FIELDS, MAX_TEAM_SIZE } from '../constants.js';
import { toastSuccess, toastError, toastWarning, toastInfo, toastConfirm } from '../utils/toast.jsx';

export default function MiniGameStatEntry({ miniGame, index, onDeleted }) {
  const [teams, setTeams] = useState({ [TEAMS[0]]: [], [TEAMS[1]]: [], [BENCH]: [] });
  const [unassigned, setUnassigned] = useState([]);
  const [liveScore, setLiveScore] = useState({
    raskoScore: miniGame.raskoScore,
    shoshanatScore: miniGame.shoshanatScore,
  });
  const [finished, setFinished] = useState(miniGame.finished);
  const [collapsed, setCollapsed] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const [shakeKey, setShakeKey] = useState(null);

  function loadRoster() {
    api.miniGameStats
      .forMiniGame(miniGame._id)
      .then((data) => {
        setTeams(data.teams);
        setUnassigned(data.unassigned);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(loadRoster, [miniGame._id]);

  function handleTeamButtonClick(playerId, team) {
    const isFull = team !== BENCH && teams[team].length >= MAX_TEAM_SIZE;
    if (isFull) {
      const key = `${playerId}-${team}`;
      setShakeKey(key);
      setTimeout(() => setShakeKey((k) => (k === key ? null : k)), 400);
      toastWarning(`${team} is full (max ${MAX_TEAM_SIZE} players)`);
      return;
    }
    handleAssign(playerId, team);
  }

  async function handleAssign(playerId, team) {
    setError('');
    setBusyKey(`assign-${playerId}`);
    try {
      const result = await api.miniGameStats.assign(playerId, miniGame._id, team);
      if (result.miniGameScore) setLiveScore(result.miniGameScore);
      loadRoster();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnassign(playerId) {
    const confirmed = await toastConfirm('Remove this player from the mini-game?');
    if (!confirmed) return;
    setError('');
    setBusyKey(`unassign-${playerId}`);
    try {
      const result = await api.miniGameStats.unassign(playerId, miniGame._id);
      if (result.miniGameScore) setLiveScore(result.miniGameScore);
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAdjust(playerId, team, field, delta) {
    const key = `${playerId}-${field}-${delta}`;
    setBusyKey(key);
    setError('');

    setTeams((prev) => ({
      ...prev,
      [team]: prev[team].map((row) =>
        row.player._id === playerId
          ? { ...row, stats: { ...row.stats, [field]: Math.max(0, row.stats[field] + delta) } }
          : row
      ),
    }));

    try {
      const result = await api.miniGameStats.increment(playerId, miniGame._id, field, delta);
      if (result.miniGameScore) setLiveScore(result.miniGameScore);
    } catch (err) {
      setError(err.message);
      toastError(err.message);
      loadRoster();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleFinish() {
    const confirmed = await toastConfirm(
      'Finish this mini-game? Stats will be locked and wins awarded to the winning team.'
    );
    if (!confirmed) return;
    setError('');
    try {
      const result = await api.miniGames.finish(miniGame._id);
      setLiveScore({ raskoScore: result.miniGame.raskoScore, shoshanatScore: result.miniGame.shoshanatScore });
      setFinished(true);
      setCollapsed(true);
      toastInfo('Mini-game finished');
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleEdit() {
    setError('');
    try {
      const result = await api.miniGames.reopen(miniGame._id);
      setLiveScore({ raskoScore: result.miniGame.raskoScore, shoshanatScore: result.miniGame.shoshanatScore });
      setFinished(false);
      setCollapsed(false);
      setReopened(true);
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDeleteMiniGame() {
    const confirmed = await toastConfirm('Delete this mini-game and all its stats?');
    if (!confirmed) return;
    try {
      await api.miniGames.remove(miniGame._id);
      toastSuccess('Mini-game deleted');
      onDeleted();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  const winner =
    liveScore.raskoScore > liveScore.shoshanatScore
      ? TEAMS[0]
      : liveScore.shoshanatScore > liveScore.raskoScore
      ? TEAMS[1]
      : null;

  if (finished && collapsed) {
    return (
      <div className="minigame-block minigame-collapsed">
        <div className="minigame-collapsed-summary">
          <span className="minigame-collapsed-title">Mini-Game #{index + 1}</span>
          <span className="minigame-score">
            {liveScore.raskoScore} - {liveScore.shoshanatScore}
          </span>
          <span className="minigame-collapsed-winner">{winner ? `🏆 ${winner}` : 'Tie'}</span>
          <div className="minigame-collapsed-actions">
            <button type="button" className="btn btn-sm" onClick={() => setCollapsed(false)}>
              הצג פרטים ▾
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleEdit}>
              ערוך משחקון ✏️
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="minigame-block">
      <div className="minigame-block-header">
        <h3 className="team-column-title">Mini-Game #{index + 1}</h3>
        <div className="minigame-score">
          {liveScore.raskoScore} - {liveScore.shoshanatScore}
        </div>
        <div className="minigame-header-actions">
          {finished && (
            <button type="button" className="btn btn-sm" onClick={() => setCollapsed(true)}>
              כווץ ▴
            </button>
          )}
          <button type="button" className="btn btn-sm btn-danger" onClick={handleDeleteMiniGame}>
            Delete Mini-Game
          </button>
        </div>
      </div>

      {finished && (
        <div className="finished-banner">
          🏁 <bdi>משחקון הסתיים</bdi> &middot; {liveScore.raskoScore} - {liveScore.shoshanatScore} &middot;{' '}
          {winner ? `Winner: ${winner}` : 'Tie — no winner'}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {!finished && unassigned.length > 0 && (
        <div className="unassigned-panel">
          <h3>Assign Players</h3>
          <div className="unassigned-list">
            {unassigned.map((p) => (
              <div key={p._id} className="unassigned-chip">
                <span>{p.name}</span>
                <div className="unassigned-actions">
                  {TEAMS.map((team) => {
                    const isFull = teams[team].length >= MAX_TEAM_SIZE;
                    const shaking = shakeKey === `${p._id}-${team}`;
                    return (
                      <button
                        key={team}
                        type="button"
                        className={`btn btn-sm ${isFull ? 'btn-team-full' : 'btn-primary'} ${
                          shaking ? 'btn-shake' : ''
                        }`}
                        disabled={busyKey === `assign-${p._id}`}
                        onClick={() => handleTeamButtonClick(p._id, team)}
                      >
                        {team}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-sm btn-bench"
                    disabled={busyKey === `assign-${p._id}`}
                    onClick={() => handleAssign(p._id, BENCH)}
                  >
                    🪑 Bench
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stat-entry-columns">
        {TEAMS.map((team) => (
          <div key={team} className="stat-entry-column">
            <h3 className="team-column-title">
              {team} ({teams[team].length}/{MAX_TEAM_SIZE})
            </h3>
            {teams[team].length === 0 ? (
              <p className="team-column-empty">No players assigned yet.</p>
            ) : (
              <div className="stat-entry-grid">
                {teams[team].map((row) => (
                  <div key={row.player._id} className="stat-entry-card">
                    <div className="stat-entry-card-header">
                      <img
                        src={row.player.photo || 'https://placehold.co/60x60'}
                        alt={row.player.name}
                        className="admin-thumb"
                      />
                      <h3>{row.player.name}</h3>
                      <button
                        type="button"
                        className="stat-entry-remove"
                        disabled={finished || busyKey === `unassign-${row.player._id}`}
                        onClick={() => handleUnassign(row.player._id)}
                        aria-label={`Remove ${row.player.name} from mini-game`}
                      >
                        &times;
                      </button>
                    </div>
                    <div className="stat-entry-rows">
                      {STAT_FIELDS.map(([field, label]) => {
                        const plusDelta = field === 'points' ? 2 : 1;
                        const plusLabel = field === 'points' ? '+2' : '+';
                        return (
                          <div key={field} className="stat-row">
                            <span className="stat-row-label">{label}</span>
                            <div className="stat-counter">
                              <button
                                type="button"
                                className="stat-counter-btn stat-counter-minus"
                                disabled={finished || busyKey === `${row.player._id}-${field}--1`}
                                onClick={() => handleAdjust(row.player._id, team, field, -1)}
                                aria-label={`Decrease ${label} for ${row.player.name}`}
                              >
                                &minus;
                              </button>
                              <span className="stat-counter-value">{row.stats[field]}</span>
                              <button
                                type="button"
                                className={`stat-counter-btn stat-counter-plus ${
                                  field === 'points' ? 'stat-counter-plus-wide' : ''
                                }`}
                                disabled={finished || busyKey === `${row.player._id}-${field}-${plusDelta}`}
                                onClick={() => handleAdjust(row.player._id, team, field, plusDelta)}
                                aria-label={`Increase ${label} for ${row.player.name} by ${plusDelta}`}
                              >
                                {plusLabel}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {teams[BENCH].length > 0 && (
        <div className="bench-row">
          <span className="bench-row-label">🪑 Bench</span>
          {teams[BENCH].map((p) => (
            <span key={p.player._id} className="bench-chip bench-chip-removable">
              {p.player.name}
              <button
                type="button"
                className="bench-chip-remove"
                disabled={finished || busyKey === `unassign-${p.player._id}`}
                onClick={() => handleUnassign(p.player._id)}
                aria-label={`Remove ${p.player.name} from bench`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {!finished && (
        <button type="button" className="btn btn-primary btn-finish" onClick={handleFinish}>
          {reopened ? 'סיים שוב ✓' : 'סיים משחקון ✓'}
        </button>
      )}
    </div>
  );
}
