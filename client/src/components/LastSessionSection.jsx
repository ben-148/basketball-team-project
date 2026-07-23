import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatDate } from '../utils/date.js';
import StatsTable from './StatsTable.jsx';

const SESSION_STATS_COLUMNS = ['player', 'points', 'assists', 'rebounds', 'steals', 'turnovers', 'wins'];

// Priority order: wins first, then points, assists, rebounds, steals — both for which card
// leads the row and for the order categories are listed within a single player's card.
const MVP_CATEGORIES = [
  { field: 'wins', label: 'נצחונות', emoji: '🏆' },
  { field: 'points', label: 'נקודות', emoji: '👑' },
  { field: 'assists', label: 'אסיסט', emoji: '👑' },
  { field: 'rebounds', label: 'ריבאונד', emoji: '👑' },
  { field: 'steals', label: 'חטיפות', emoji: '👑' },
];

// One card per player — a player leading multiple categories gets a single card listing every
// category they lead, in priority order. Categories where nobody scored above 0 are skipped.
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
      playerCards.get(id).categories.push({ field, label, emoji, value: max });
    }
  });

  return Array.from(playerCards.values()).sort((a, b) => a.priorityIndex - b.priorityIndex);
}

export default function LastSessionSection() {
  const [detail, setDetail] = useState(null);
  const [miniGameCount, setMiniGameCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sessions
      .list()
      .then((sessions) => {
        if (sessions.length === 0) return null;
        const latest = sessions[0];
        setMiniGameCount(latest.miniGameCount || 0);
        return api.sessions.get(latest._id);
      })
      .then((data) => data && setDetail(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading || error || !detail) return null;

  const { session, summary } = detail;
  const mvpCards = buildMvpCards(summary);

  return (
    <div className="page-container">
      <section className="last-session-section">
        <div className="last-session-header">
          <h2 className="section-title">🏀 הסשן האחרון</h2>
          <Link to={`/sessions/${session._id}`} className="last-session-link">
            לעמוד הסשן ←
          </Link>
        </div>
        <p className="last-session-meta">
          {formatDate(session.date)} · {miniGameCount} משחקונים
        </p>

        {mvpCards.length > 0 ? (
          <div className="mvp-row">
            {mvpCards.map((card) => (
              <Link key={card.key} to={`/players/${card.player._id}`} className="mvp-card">
                <img
                  className="mvp-card-photo"
                  src={card.player.photo || 'https://placehold.co/120x120?text=No+Photo'}
                  alt={card.player.name}
                />
                <div className="mvp-card-body">
                  <h3 className="mvp-card-name">{card.player.name}</h3>
                  <ul className="mvp-card-categories">
                    {card.categories.map((c) => (
                      <li key={c.field} className="mvp-card-category-line">
                        <span className="mvp-card-emoji">{c.emoji}</span>
                        {c.label} · {c.value}
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
            <h3 className="last-session-stats-title">סטטיסטיקות הסשן</h3>
            <StatsTable
              rows={summary.map((row) => ({
                key: row.player._id,
                player: row.player,
                points: row.totals.points,
                assists: row.totals.assists,
                rebounds: row.totals.rebounds,
                steals: row.totals.steals,
                turnovers: row.totals.turnovers,
                wins: row.totals.wins,
              }))}
              columns={SESSION_STATS_COLUMNS}
              wrapClassName="last-session-stats-scroll"
              highlightLeaders
            />
          </div>
        )}
      </section>
    </div>
  );
}
