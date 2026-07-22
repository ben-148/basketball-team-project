import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { TEAMS, BENCH, STAT_FIELDS, MAX_TEAM_SIZE } from "../constants.js";
import {
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastConfirm,
} from "../utils/toast.jsx";
import MiniGameSummaryLine from "./MiniGameSummaryLine.jsx";
import MiniGameTeamPills from "./MiniGameTeamPills.jsx";

const TEAM_BUTTON_ORDER = [...TEAMS, BENCH];
const MINIGAME_TABLE_FIELDS = STAT_FIELDS.filter(([field]) => field !== "wins");

function teamButtonBaseClass(team) {
  if (team === TEAMS[0]) return "team-btn-rasko";
  if (team === TEAMS[1]) return "team-btn-shoshanat";
  return "btn-bench";
}

function sumPoints(rows) {
  return (rows || []).reduce((sum, row) => sum + (row.stats.points || 0), 0);
}

export default function MiniGameStatEntry({ miniGame, index, onDeleted }) {
  const [teams, setTeams] = useState({
    [TEAMS[0]]: [],
    [TEAMS[1]]: [],
    [BENCH]: [],
  });
  const [unassigned, setUnassigned] = useState([]);
  const [finished, setFinished] = useState(miniGame.finished);
  const [collapsed, setCollapsed] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [shakeKey, setShakeKey] = useState(null);
  const [finishing, setFinishing] = useState(false);

  // Merges a freshly-fetched roster into local state without discarding stats the admin has
  // already tallied locally but not yet saved (stats are only persisted to the DB on finish).
  function mergeStatsIntoFreshRoster(freshTeams, prevTeams) {
    const localStatsByPlayer = new Map();
    for (const team of Object.keys(prevTeams)) {
      for (const row of prevTeams[team]) {
        localStatsByPlayer.set(row.player._id, row.stats);
      }
    }
    const merged = {};
    for (const team of Object.keys(freshTeams)) {
      merged[team] = freshTeams[team].map((row) => ({
        ...row,
        stats: localStatsByPlayer.get(row.player._id) || row.stats,
      }));
    }
    return merged;
  }

  // Used after assign/unassign: preserves any stats the admin has tallied locally but not yet
  // saved for players unaffected by the roster change.
  function loadRoster() {
    api.miniGameStats
      .forMiniGame(miniGame._id)
      .then((data) => {
        setTeams((prev) => mergeStatsIntoFreshRoster(data.teams, prev));
        setUnassigned(data.unassigned);
      })
      .catch((err) => setError(err.message));
  }

  // Used on mount and after finish/reopen: local state is stale or has just been fully flushed
  // to the server (finish also awards wins server-side), so fresh server data should win outright.
  function loadRosterFresh() {
    api.miniGameStats
      .forMiniGame(miniGame._id)
      .then((data) => {
        setTeams(data.teams);
        setUnassigned(data.unassigned);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(loadRosterFresh, [miniGame._id]);

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

  function renderTeamButtons(playerId, currentTeam) {
    return (
      <div className="team-btn-group">
        {TEAM_BUTTON_ORDER.map((team) => {
          const isActive = currentTeam === team;
          const isFull =
            team !== BENCH && !isActive && teams[team].length >= MAX_TEAM_SIZE;
          const shaking = shakeKey === `${playerId}-${team}`;
          const classNames = [
            "btn",
            "btn-sm",
            isFull ? "btn-team-full" : teamButtonBaseClass(team),
            isActive ? "team-btn-active" : "",
            !isActive && currentTeam ? "team-btn-dimmed" : "",
            shaking ? "btn-shake" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={team}
              type="button"
              className={classNames}
              disabled={isActive || busyKey === `assign-${playerId}`}
              onClick={() => handleTeamButtonClick(playerId, team)}
            >
              {team === BENCH ? "🪑 Bench" : team}
            </button>
          );
        })}
      </div>
    );
  }

  async function handleAssign(playerId, team) {
    setError("");
    setBusyKey(`assign-${playerId}`);
    try {
      await api.miniGameStats.assign(playerId, miniGame._id, team);
      loadRoster();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUnassign(playerId) {
    setError("");
    setBusyKey(`unassign-${playerId}`);
    try {
      await api.miniGameStats.unassign(playerId, miniGame._id);
      toastInfo("Player removed from mini-game");
      loadRoster();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  // Purely local — nothing is written to the DB until "סיים משחקון" is clicked, at which point
  // handleFinish saves each player's final tally in one call.
  function handleAdjust(playerId, team, field, delta) {
    setTeams((prev) => ({
      ...prev,
      [team]: prev[team].map((row) =>
        row.player._id === playerId
          ? {
              ...row,
              stats: {
                ...row.stats,
                [field]: Math.max(0, row.stats[field] + delta),
              },
            }
          : row,
      ),
    }));
  }

  async function handleFinish() {
    setError("");
    setFinishing(true);
    try {
      const rowsToSave = [...teams[TEAMS[0]], ...teams[TEAMS[1]]];
      await Promise.all(
        rowsToSave.map((row) =>
          api.miniGameStats.save(row.player._id, miniGame._id, row.stats),
        ),
      );

      await api.miniGames.finish(miniGame._id);
      setFinished(true);
      setCollapsed(true);
      toastInfo("Mini-game finished");
      loadRosterFresh();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    } finally {
      setFinishing(false);
    }
  }

  async function handleEdit() {
    setError("");
    try {
      await api.miniGames.reopen(miniGame._id);
      setFinished(false);
      setCollapsed(false);
      setReopened(true);
      loadRosterFresh();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  async function handleDeleteMiniGame() {
    const confirmed = await toastConfirm(
      "Delete this mini-game and all its stats?",
    );
    if (!confirmed) return;
    try {
      await api.miniGames.remove(miniGame._id);
      toastSuccess("Mini-game deleted");
      onDeleted();
    } catch (err) {
      setError(err.message);
      toastError(err.message);
    }
  }

  const currentScore = {
    raskoScore: sumPoints(teams[TEAMS[0]]),
    shoshanatScore: sumPoints(teams[TEAMS[1]]),
  };

  if (finished && collapsed) {
    return (
      <div className="minigame-block minigame-collapsed">
        <div className="minigame-collapsed-summary">
          <MiniGameSummaryLine
            index={index}
            raskoScore={currentScore.raskoScore}
            shoshanatScore={currentScore.shoshanatScore}
            teams={teams}
          />
          <div className="minigame-collapsed-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setCollapsed(false)}
            >
              הצג פרטים ▾
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleEdit}
            >
              ערוך משחקון ✏️
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished && !collapsed) {
    return (
      <div className="minigame-block minigame-view-mode">
        <div className="minigame-block-header">
          <h3 className="team-column-title">Mini-Game #{index + 1}</h3>
          <div className="minigame-score minigame-score-large">
            {currentScore.raskoScore} - {currentScore.shoshanatScore}
          </div>
          <div className="minigame-header-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setCollapsed(true)}
            >
              כווץ ▴
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleEdit}
            >
              ערוך משחקון ✏️
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleDeleteMiniGame}
            >
              Delete Mini-Game
            </button>
          </div>
        </div>

        <div className="minigame-summary-line minigame-pills-standalone">
          <MiniGameTeamPills
            raskoScore={currentScore.raskoScore}
            shoshanatScore={currentScore.shoshanatScore}
            teams={teams}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="stat-entry-columns">
          {TEAMS.map((team) => (
            <div key={team} className="stat-entry-column">
              <h3 className="team-column-title">{team}</h3>
              {teams[team].length === 0 ? (
                <p className="team-column-empty">No players assigned.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        {MINIGAME_TABLE_FIELDS.map(([field, label]) => (
                          <th key={field}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teams[team].map((row) => (
                        <tr key={row.player._id}>
                          <td>{row.player.name}</td>
                          {MINIGAME_TABLE_FIELDS.map(([field]) => (
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

        {teams[BENCH].length > 0 && (
          <div className="bench-row">
            <span className="bench-row-label">🪑 ספסל</span>
            {teams[BENCH].map((p) => (
              <span key={p.player._id} className="bench-chip">
                {p.player.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="minigame-block">
      <div className="minigame-block-header">
        <h3 className="team-column-title">Mini-Game #{index + 1}</h3>
        <div className="minigame-score">
          {currentScore.raskoScore} - {currentScore.shoshanatScore}
        </div>
        <div className="minigame-header-actions">
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleDeleteMiniGame}
          >
            Delete Mini-Game
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {unassigned.length > 0 && (
        <div className="unassigned-panel">
          <h3>Assign Players</h3>
          <div className="unassigned-list">
            {unassigned.map((p) => (
              <div key={p._id} className="unassigned-chip">
                <span>{p.name}</span>
                {renderTeamButtons(p._id, null)}
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
              <div className="table-wrap">
                <table className="stat-entry-compact-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      {MINIGAME_TABLE_FIELDS.map(([field, label]) => (
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
                            src={row.player.photo || "https://placehold.co/60x60"}
                            alt={row.player.name}
                            className="stat-entry-photo-sm"
                          />
                          <span>{row.player.name}</span>
                        </td>
                        {MINIGAME_TABLE_FIELDS.map(([field, label]) => {
                          const plusDelta = field === "points" ? 2 : 1;
                          const plusLabel = field === "points" ? "+2" : "+";
                          return (
                            <td key={field}>
                              <div className="stat-counter stat-counter-sm">
                                <button
                                  type="button"
                                  className="stat-counter-btn stat-counter-btn-sm stat-counter-minus"
                                  disabled={finishing}
                                  onClick={() => handleAdjust(row.player._id, team, field, -1)}
                                  aria-label={`Decrease ${label} for ${row.player.name}`}
                                >
                                  &minus;
                                </button>
                                <span className="stat-counter-value stat-counter-value-sm">
                                  {row.stats[field]}
                                </span>
                                <button
                                  type="button"
                                  className={`stat-counter-btn stat-counter-btn-sm stat-counter-plus ${
                                    field === "points" ? "stat-counter-plus-wide-sm" : ""
                                  }`}
                                  disabled={finishing}
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
                            aria-label={`Remove ${row.player.name} from mini-game`}
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

      {teams[BENCH].length > 0 && (
        <div className="bench-row">
          <span className="bench-row-label">🪑 Bench</span>
          {teams[BENCH].map((p) => (
            <span key={p.player._id} className="bench-chip">
              {p.player.name}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-finish"
        onClick={handleFinish}
        disabled={finishing}
      >
        {finishing ? "שומר..." : reopened ? "סיים שוב ✓" : "סיים משחקון ✓"}
      </button>
    </div>
  );
}
