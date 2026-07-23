import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import VideoCard from '../components/VideoCard.jsx';
import StatValue from '../components/StatValue.jsx';
import StatsTable from '../components/StatsTable.jsx';
import { STAT_FIELDS as STAT_LABELS } from '../constants.js';
import { formatDate } from '../utils/date.js';

const SESSIONS_PAGE_SIZE = 10;
const SESSION_LOG_COLUMNS = [
  'date',
  'points',
  'assists',
  'rebounds',
  'steals',
  'turnovers',
  { key: 'gamesPlayed', label: 'Mini-Games' },
  'wins',
];
const MINIGAME_BREAKDOWN_COLUMNS = [
  'miniGameNumber',
  'team',
  'points',
  'assists',
  'rebounds',
  'steals',
  'turnovers',
  'wins',
];

// Groups the flat per-mini-game/legacy-game log into one row per evening session (mini-games
// aggregated together) plus one row per legacy game (kept standalone — no mini-game breakdown).
function buildSessionEntries(gameLog) {
  const sessionsMap = new Map();
  const entries = [];

  for (const row of gameLog) {
    if (row.type === 'legacy') {
      entries.push({ type: 'legacy', key: `legacy-${row._id}`, date: row.date, row });
      continue;
    }
    if (!sessionsMap.has(row.sessionId)) {
      const session = { type: 'session', key: `session-${row.sessionId}`, sessionId: row.sessionId, date: row.date, miniGames: [] };
      sessionsMap.set(row.sessionId, session);
      entries.push(session);
    }
    sessionsMap.get(row.sessionId).miniGames.push(row);
  }

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  return entries;
}

function sumStats(rows) {
  const totals = {};
  for (const [field] of STAT_LABELS) {
    totals[field] = rows.reduce((sum, r) => sum + (r[field] || 0), 0);
  }
  return totals;
}

function MiniGameBreakdown({ miniGames }) {
  const sorted = [...miniGames].sort((a, b) => new Date(a.miniGameCreatedAt) - new Date(b.miniGameCreatedAt));
  const rows = sorted.map((mg, i) => ({
    key: mg.miniGameId,
    miniGameNumber: i + 1,
    team: mg.team,
    points: mg.points,
    assists: mg.assists,
    rebounds: mg.rebounds,
    steals: mg.steals,
    turnovers: mg.turnovers,
    wins: mg.wins,
  }));
  return <StatsTable rows={rows} columns={MINIGAME_BREAKDOWN_COLUMNS} tableClassName="session-log-subtable" />;
}

export default function PlayerPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.players
      .get(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container error-text">{error}</div>;
  if (!data) return null;

  const { player, lifetime, gameLog, videos } = data;
  const sessionEntries = buildSessionEntries(gameLog);
  const visibleEntries = showAllSessions ? sessionEntries : sessionEntries.slice(0, SESSIONS_PAGE_SIZE);

  const tableRows = visibleEntries.map((entry) => {
    if (entry.type === 'legacy') {
      return {
        key: entry.key,
        date: entry.date,
        link: `/legacy-sessions/${entry.row.gameId}`,
        points: entry.row.points,
        rebounds: entry.row.rebounds,
        assists: entry.row.assists,
        steals: entry.row.steals,
        turnovers: entry.row.turnovers,
        wins: entry.row.wins,
        gamesPlayed: null,
        expandable: false,
      };
    }
    const totals = sumStats(entry.miniGames);
    return {
      key: entry.key,
      date: entry.date,
      link: `/sessions/${entry.sessionId}`,
      points: totals.points,
      rebounds: totals.rebounds,
      assists: totals.assists,
      steals: totals.steals,
      turnovers: totals.turnovers,
      wins: totals.wins,
      gamesPlayed: entry.miniGames.length,
      expandable: true,
      expanded: expandedKey === entry.key,
      expandedContent: <MiniGameBreakdown miniGames={entry.miniGames} />,
    };
  });

  const metaParts = [];
  if (player.age != null) metaParts.push(`Age ${player.age}`);
  if (player.dateOfBirth) metaParts.push(`Born ${formatDate(player.dateOfBirth)}`);

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        &larr; Back to team
      </Link>

      <div className="player-hero">
        <img
          className="player-header-photo"
          src={player.photo || 'https://placehold.co/300x300?text=No+Photo'}
          alt={player.name}
        />
        <div>
          <h1 className="player-hero-name">{player.name}</h1>
          {metaParts.length > 0 && <p className="player-hero-meta">{metaParts.join(' · ')}</p>}
          {player.bio && <p className="player-bio">{player.bio}</p>}
        </div>
      </div>

      <section>
        <h2 className="section-title">Career Stats ({lifetime.gamesPlayed} played)</h2>
        <div className="stat-grid">
          {STAT_LABELS.map(([field, label]) => (
            <div key={field} className="stat-tile">
              <div className="stat-value">
                <StatValue value={lifetime[field]} />
              </div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
          <div className="stat-tile">
            <div className="stat-value">{lifetime.benchCount}</div>
            <div className="stat-label">🪑 ספסל</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Session Log</h2>
        {sessionEntries.length === 0 ? (
          <p>No session stats recorded yet.</p>
        ) : (
          <>
            <StatsTable
              rows={tableRows}
              columns={SESSION_LOG_COLUMNS}
              wrapClassName="session-log-scroll"
              onRowClick={(row) =>
                row.expandable !== false &&
                setExpandedKey((prev) => (prev === row.key ? null : row.key))
              }
            />
            {!showAllSessions && sessionEntries.length > SESSIONS_PAGE_SIZE && (
              <button type="button" className="btn btn-sm session-log-show-all" onClick={() => setShowAllSessions(true)}>
                הצג הכל
              </button>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="section-title">Videos</h2>
        {videos.length === 0 ? (
          <p>No videos tagged to this player yet.</p>
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v._id} video={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
