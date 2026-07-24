import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate } from '../utils/date.js';
import { getInitials } from '../utils/avatar.js';
import { RAW_STAT_KEYS, STAR_STAT_KEYS, TROPHY_STAT_KEY, getStatColumn } from '../config/statConfig.js';
import StatsTable from './StatsTable.jsx';

const SESSION_STATS_COLUMNS = ['player', ...RAW_STAT_KEYS];
const SESSION_STATS_PREVIEW_COUNT = 4;
const LEADER_FIELDS = [...STAR_STAT_KEYS, TROPHY_STAT_KEY];

// Computed against the FULL session summary regardless of how many rows are actually shown, so
// the ⭐/🏆 badges stay correct even when the table is collapsed to the top-4-by-wins preview.
function computeSessionStatsLeaderFields(summary) {
  const maxes = {};
  for (const field of LEADER_FIELDS) {
    maxes[field] = summary.reduce((best, row) => Math.max(best, row.totals[field] || 0), 0);
  }
  const result = {};
  for (const row of summary) {
    result[row.player._id] = LEADER_FIELDS.filter((f) => maxes[f] > 0 && row.totals[f] === maxes[f]);
  }
  return result;
}

// Priority order: wins first, then points, assists, rebounds, steals — both for which card leads
// the row and for the order categories are listed within a single player's card. This ordering
// (and the 👑/🏆 emoji split) is specific to the MVP spotlight, distinct from the ⭐/🏆 table
// leader badges — only the label text is sourced from the shared stat config.
const MVP_CATEGORY_ORDER = ['wins', 'points', 'assists', 'rebounds', 'steals'];
const MVP_CATEGORIES = MVP_CATEGORY_ORDER.map((field) => ({
  field,
  label: getStatColumn(field).label,
  emoji: field === 'wins' ? '🏆' : '👑',
}));

// One card per player — a player leading multiple categories gets a single card listing every
// category they lead, in priority order. Categories where nobody scored above 0 are skipped.
// `firstCareerFields` (server-computed) marks which of those leads are also the first time ever
// in this player's career they've led that category.
function buildMvpCards(summary) {
  const playerCards = new Map();

  MVP_CATEGORIES.forEach(({ field, label, emoji }, priorityIndex) => {
    const max = summary.reduce((best, row) => Math.max(best, row.totals[field] || 0), 0);
    if (max <= 0) return;
    for (const row of summary) {
      if (row.totals[field] !== max) continue;
      const id = row.player._id;
      if (!playerCards.has(id)) {
        playerCards.set(id, { key: id, player: row.player, priorityIndex, categories: [] });
      }
      const isFirstCareer = (row.firstCareerFields || []).includes(field);
      playerCards.get(id).categories.push({ field, label, emoji, value: max, isFirstCareer });
    }
  });

  return Array.from(playerCards.values()).sort((a, b) => a.priorityIndex - b.priorityIndex);
}

function MvpBanner({ player }) {
  const style = player.photo ? { backgroundImage: `url(${player.photo})` } : undefined;
  return (
    <div className={`mvp-card-banner${player.photo ? '' : ' mvp-card-banner-fallback'}`} style={style}>
      {!player.photo && <span className="mvp-card-banner-initials">{getInitials(player.name)}</span>}
      <div className="mvp-card-banner-overlay" />
      <h3 className="mvp-card-name">{player.name}</h3>
    </div>
  );
}

export default function LastSessionSection() {
  const [entry, setEntry] = useState(null); // { type: 'session' | 'legacy', id, date, miniGameCount }
  const [summary, setSummary] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllStats, setShowAllStats] = useState(false);

  // "Last session" has to consider both collections — a legacy game imported today is just as
  // much "the last session" as a brand-new mini-game session would be. Same merge-by-date
  // pattern SessionsList.jsx uses for the /sessions page.
  useEffect(() => {
    Promise.all([api.sessions.list(), api.games.list()])
      .then(([sessions, games]) => {
        const sessionEntries = sessions.map((s) => ({
          type: 'session',
          id: s._id,
          date: s.date,
          miniGameCount: s.miniGameCount,
        }));
        const legacyEntries = games.map((g) => ({ type: 'legacy', id: g._id, date: g.date }));
        const merged = [...sessionEntries, ...legacyEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (merged.length === 0) return null;

        const latest = merged[0];
        setEntry(latest);
        if (latest.type === 'session') {
          return api.sessions.get(latest.id).then((data) => ({ summary: data.summary, guests: [] }));
        }
        // Only legacy games can have unresolved PendingPlayer ("guest") rows from a PDF import.
        return Promise.all([
          api.legacyStats.forGame(latest.id).then((data) => data.summary),
          api.pendingPlayers.forGame(latest.id),
        ]).then(([summaryData, guestRows]) => ({ summary: summaryData, guests: guestRows }));
      })
      .then((result) => {
        if (!result) return;
        setSummary(result.summary);
        setGuests(result.guests);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error || !entry || !summary) return null;

  const mvpCards = buildMvpCards(summary);
  const leaderFieldsByPlayer = computeSessionStatsLeaderFields(summary);
  const statsRows = summary
    .map((row) => ({
      key: row.player._id,
      player: row.player,
      ...Object.fromEntries(RAW_STAT_KEYS.map((field) => [field, row.totals[field]])),
      leaderFields: leaderFieldsByPlayer[row.player._id] || [],
    }))
    .sort((a, b) => b.wins - a.wins);
  const visibleStatsRows = showAllStats ? statsRows : statsRows.slice(0, SESSION_STATS_PREVIEW_COUNT);
  const hasMoreStatsRows = statsRows.length > SESSION_STATS_PREVIEW_COUNT;

  return (
    <div className="last-session-band">
      <div className="page-container">
        <section className="last-session-section">
          <div className="last-session-header">
            <h2 className="section-title">🏀 הסשן האחרון</h2>
            <Link
              to={entry.type === 'session' ? `/sessions/${entry.id}` : `/legacy-sessions/${entry.id}`}
              className="btn btn-sm btn-primary"
            >
              לעמוד הסשן ←
            </Link>
          </div>
          <p className="last-session-meta">
            {formatDate(entry.date)} ·{' '}
            {entry.type === 'session' ? `${entry.miniGameCount || 0} משחקונים` : 'סשן ישן (Legacy)'}
          </p>

          {mvpCards.length > 0 ? (
            <div className="mvp-row">
              {mvpCards.map((card) => (
                <Link key={card.key} to={`/players/${card.player._id}`} className="mvp-card">
                  <MvpBanner player={card.player} />
                  <div className="mvp-card-body">
                    <ul className="mvp-card-categories">
                      {card.categories.map((c) => (
                        <li key={c.field} className="mvp-card-category-line">
                          <span className="mvp-card-emoji">{c.emoji}</span>
                          {c.label} · {c.value}
                          {c.isFirstCareer && <span className="mvp-card-first-career"> · לראשונה בקריירה</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="last-session-empty">אין עדיין נתונים לסשן זה.</p>
          )}

          {summary.length > 0 && (
            <div className="last-session-stats">
              <div className="last-session-stats-title-row">
                <h3 className="last-session-stats-title">סטטיסטיקות הסשן</h3>
                {hasMoreStatsRows && (
                  <button
                    type="button"
                    className="last-session-stats-show-all"
                    onClick={() => setShowAllStats((prev) => !prev)}
                  >
                    {showAllStats ? 'הצג פחות' : 'הצג הכל'}
                  </button>
                )}
              </div>
              <StatsTable
                rows={visibleStatsRows}
                columns={SESSION_STATS_COLUMNS}
                wrapClassName="last-session-stats-scroll"
                getRowLeaderFields={(row) => row.leaderFields}
              />
            </div>
          )}

          {guests.length > 0 && (
            <div className="last-session-guests">
              <h3 className="last-session-guests-title">👤 אורחים</h3>
              <ul className="last-session-guests-list">
                {guests.map((g) => (
                  <li key={g._id} className="last-session-guest-row">
                    <span className="last-session-guest-name">👤 {g.nameInFile}</span>
                    <span className="last-session-guest-stats">
                      {RAW_STAT_KEYS.map((key) => `${getStatColumn(key).label} ${g[key] ?? 'N/A'}`).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
