// Single source of truth for stat column order across the app. Changing the order (or adding /
// removing a stat) here updates StatsTable, the player page tiles, MVP cards, session summary,
// the leaderboard, and the session log automatically.
export const STAT_COLUMNS = [
  { key: 'points', label: 'נקודות', emoji: '⭐', ranked: true },
  { key: 'assists', label: 'אסיסטים', emoji: '⭐', ranked: true },
  { key: 'rebounds', label: 'ריבאונדים', emoji: '⭐', ranked: true },
  { key: 'steals', label: 'חטיפות', emoji: '⭐', ranked: true },
  { key: 'turnovers', label: 'איבודים', emoji: null, ranked: false },
  { key: 'wins', label: 'נצחונות', emoji: '🏆', ranked: true },
  { key: 'awards', label: 'הצטיינויות', emoji: null, ranked: false },
];

// The raw, summable per-game stats — everything except the derived "awards" (הצטיינויות) count.
export const RAW_STAT_KEYS = STAT_COLUMNS.filter((c) => c.key !== 'awards').map((c) => c.key);

// Keys eligible for a ⭐ leader indicator in tables (points/assists/rebounds/steals).
export const STAR_STAT_KEYS = STAT_COLUMNS.filter((c) => c.emoji === '⭐').map((c) => c.key);

// The single key eligible for a 🏆 leader indicator (wins).
export const TROPHY_STAT_KEY = STAT_COLUMNS.find((c) => c.emoji === '🏆')?.key ?? null;

// "awards" (הצטיינויות) is a derived count, not a raw per-game field — API responses still call
// it `achievements` (lifetime.achievements, row.achievements, ranks.achievements). This is the
// one place that bridges the display key to the actual data property wherever they differ.
export const STAT_VALUE_FIELD = { awards: 'achievements' };

export function getStatValueField(key) {
  return STAT_VALUE_FIELD[key] || key;
}

export function getStatColumn(key) {
  return STAT_COLUMNS.find((c) => c.key === key);
}
