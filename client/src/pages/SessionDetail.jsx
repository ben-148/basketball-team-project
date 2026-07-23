import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { formatDate } from "../utils/date.js";
import { TEAMS, BENCH, STAT_FIELDS } from "../constants.js";
import MiniGameSummaryLine from "../components/MiniGameSummaryLine.jsx";
import StatsTable from "../components/StatsTable.jsx";

const MINIGAME_TABLE_FIELDS = STAT_FIELDS.filter(([field]) => field !== "wins");
const SUMMARY_COLUMNS = ['player', 'points', 'assists', 'rebounds', 'steals', 'turnovers', 'gamesPlayed', 'wins', 'benchCount'];

export default function SessionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.sessions
      .get(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
        miniGames.map((mg, index) => {
          return (
            <section key={mg.miniGame._id} className="minigame-block">
              <div className="minigame-block-header">
                {mg.miniGame.finished ? (
                  <MiniGameSummaryLine
                    index={index}
                    raskoScore={mg.miniGame.raskoScore}
                    shoshanatScore={mg.miniGame.shoshanatScore}
                    teams={mg.teams}
                  />
                ) : (
                  <>
                    <h2 className="section-title">Mini-Game #{index + 1}</h2>
                    <div className="minigame-score">
                      {mg.miniGame.raskoScore} - {mg.miniGame.shoshanatScore}
                    </div>
                  </>
                )}
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
                              {MINIGAME_TABLE_FIELDS.map(([field, label]) => (
                                <th key={field}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {mg.teams[team].map((row) => (
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
          );
        })
      )}

      {summary.length > 0 && (
        <section>
          <h2 className="section-title">Session Summary</h2>
          <StatsTable
            rows={summary.map((row) => ({
              key: row.player._id,
              player: row.player,
              points: row.totals.points,
              rebounds: row.totals.rebounds,
              assists: row.totals.assists,
              steals: row.totals.steals,
              turnovers: row.totals.turnovers,
              wins: row.totals.wins,
              gamesPlayed: row.miniGamesPlayed,
              benchCount: row.benchCount,
            }))}
            columns={SUMMARY_COLUMNS}
            highlightLeaders
          />
        </section>
      )}
    </div>
  );
}
