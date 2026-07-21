import { STAT_FIELDS } from '../constants.js';

// Accumulates per-stat sums while excluding null values (a stat missing from a PDF import) from
// the total. If a player has played at least one game but every single value recorded for a stat
// was null (that column was never present), the final total for that stat is null (N/A) rather
// than a misleading 0.
export function createStatTotals() {
  const totals = STAT_FIELDS.reduce((acc, f) => ({ ...acc, [f]: 0 }), {});
  const hasData = STAT_FIELDS.reduce((acc, f) => ({ ...acc, [f]: false }), {});

  function add(row) {
    for (const f of STAT_FIELDS) {
      const value = row[f];
      if (value !== null && value !== undefined) {
        totals[f] += value;
        hasData[f] = true;
      }
    }
  }

  function finalize(gamesPlayed) {
    if (gamesPlayed > 0) {
      for (const f of STAT_FIELDS) {
        if (!hasData[f]) totals[f] = null;
      }
    }
    return totals;
  }

  return { add, finalize };
}
