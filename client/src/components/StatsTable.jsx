import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import StatValue from './StatValue.jsx';
import { useSortableTable } from '../hooks/useSortableTable.js';
import { BENCH } from '../constants.js';
import { STAT_COLUMNS as STAT_CONFIG, STAR_STAT_KEYS, TROPHY_STAT_KEY, getStatValueField } from '../config/statConfig.js';
import { formatDate } from '../utils/date.js';

const STAT_COLUMNS = Object.fromEntries(
  STAT_CONFIG.map(({ key, label }) => {
    const valueField = getStatValueField(key);
    return [
      key,
      {
        label,
        getValue: (row) => (typeof row[valueField] === 'number' ? row[valueField] : -1),
        render: (row) => <StatValue value={row[valueField]} />,
      },
    ];
  })
);

// Columns eligible for a leader indicator when `highlightLeaders` is on — star fields get ⭐,
// the wins field gets 🏆. Turnovers, gamesPlayed, benchCount, awards etc. never get one.
const STAR_FIELDS = STAR_STAT_KEYS;
const TROPHY_FIELD = TROPHY_STAT_KEY;

function computeLeaderValues(rows) {
  const leaders = {};
  for (const field of [...STAR_FIELDS, TROPHY_FIELD]) {
    leaders[field] = rows.reduce((max, row) => (typeof row[field] === 'number' && row[field] > max ? row[field] : max), 0);
  }
  return leaders;
}

// The full registry of column types StatsTable knows how to render. Each usage picks a subset
// (by key, optionally overriding the label) via the `columns` prop.
const COLUMN_DEFS = {
  player: {
    label: 'Player',
    getValue: (row) => row.player?.name ?? '',
    render: (row) => (
      <Link to={`/players/${row.player._id}`} onClick={(e) => e.stopPropagation()}>
        {row.player.name}
      </Link>
    ),
  },
  team: {
    label: 'Team',
    getValue: (row) => row.team ?? '',
    render: (row) => (row.team === BENCH ? '🪑 Bench' : row.team || 'N/A'),
  },
  miniGameNumber: {
    label: 'Mini-Game',
    getValue: (row) => row.miniGameNumber ?? 0,
    render: (row) => `#${row.miniGameNumber}`,
  },
  date: {
    label: 'Date',
    getValue: (row) => (row.date ? new Date(row.date).getTime() : 0),
    render: (row) =>
      row.link ? (
        <Link to={row.link} onClick={(e) => e.stopPropagation()}>
          {formatDate(row.date)}
        </Link>
      ) : (
        formatDate(row.date)
      ),
  },
  gamesPlayed: {
    label: 'משחקונים שוחקו',
    getValue: (row) => (row.gamesPlayed == null ? -1 : row.gamesPlayed),
    render: (row) => (row.gamesPlayed == null ? '—' : row.gamesPlayed),
  },
  benchCount: {
    label: '🪑 ספסל',
    getValue: (row) => row.benchCount ?? 0,
    render: (row) => row.benchCount ?? 0,
  },
  ...STAT_COLUMNS,
};

export default function StatsTable({
  rows,
  columns,
  sortable = true,
  onRowClick,
  wrapClassName,
  tableClassName,
  highlightLeaders = false,
  getRowLeaderFields,
}) {
  const normalizedColumns = columns.map((col) => {
    const key = typeof col === 'string' ? col : col.key;
    const def = COLUMN_DEFS[key];
    const label = (typeof col === 'object' && col.label) || def.label;
    return { key, label, getValue: def.getValue, render: def.render };
  });

  function getValue(row, field) {
    const col = normalizedColumns.find((c) => c.key === field);
    return col ? col.getValue(row) : null;
  }

  // Tables with a date column default to newest-first; otherwise tables with a wins column
  // default to wins descending. Everything else keeps its natural incoming row order.
  const hasDateColumn = normalizedColumns.some((c) => c.key === 'date');
  const hasWinsColumn = normalizedColumns.some((c) => c.key === 'wins');
  const defaultSort = hasDateColumn
    ? { field: 'date', dir: 'desc' }
    : hasWinsColumn
    ? { field: 'wins', dir: 'desc' }
    : { field: null, dir: null };

  const { sortedRows, toggleSort, sortIndicator } = useSortableTable(rows, getValue, defaultSort);
  const displayRows = sortable ? sortedRows : rows;
  const showExpandColumn = Boolean(onRowClick);
  // Two ways to determine leaders: the default computes the max of each column across the rows
  // actually passed in (fine when every row belongs to the same comparison pool, e.g. one row per
  // player). When rows represent something narrower — like one row per session for a single
  // player — the caller must supply getRowLeaderFields to say which categories that row led
  // among ALL participants, since that can't be derived from the displayed rows alone.
  const leaderValues = highlightLeaders && !getRowLeaderFields ? computeLeaderValues(rows) : null;

  function leaderIndicator(col, row) {
    const isStar = STAR_FIELDS.includes(col.key);
    const isTrophy = col.key === TROPHY_FIELD;
    if (!isStar && !isTrophy) return null;

    if (getRowLeaderFields) {
      const fields = getRowLeaderFields(row) || [];
      if (!fields.includes(col.key)) return null;
    } else {
      if (!leaderValues) return null;
      const leaderValue = leaderValues[col.key];
      if (leaderValue <= 0 || row[col.key] !== leaderValue) return null;
    }

    return (
      <span className="stat-leader-badge" title={isTrophy ? 'המוביל בנצחונות' : `המוביל ב${col.label}`}>
        {isTrophy ? '🏆' : '⭐'}
      </span>
    );
  }

  return (
    <div className={['table-wrap', wrapClassName].filter(Boolean).join(' ')}>
      <table className={tableClassName || undefined}>
        <thead>
          <tr>
            {showExpandColumn && <th></th>}
            {normalizedColumns.map((col) => (
              <th
                key={col.key}
                className={sortable ? 'sortable-th' : undefined}
                onClick={sortable ? () => toggleSort(col.key) : undefined}
              >
                {col.label}
                {sortable && sortIndicator(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => {
            const key = row.key ?? row.player?._id ?? row._id;
            const clickable = showExpandColumn && row.expandable !== false;
            return (
              <Fragment key={key}>
                <tr
                  className={clickable ? 'stats-table-row-clickable' : undefined}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                >
                  {showExpandColumn && (
                    <td className="stats-table-expand-arrow">
                      {row.expandable === false ? '' : row.expanded ? '▼' : '▶'}
                    </td>
                  )}
                  {normalizedColumns.map((col) => (
                    <td key={col.key}>
                      {col.render(row)}
                      {leaderIndicator(col, row)}
                    </td>
                  ))}
                </tr>
                {row.expanded && row.expandedContent && (
                  <tr className="stats-table-expanded-row">
                    <td colSpan={normalizedColumns.length + (showExpandColumn ? 1 : 0)}>{row.expandedContent}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
