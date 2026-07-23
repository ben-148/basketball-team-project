import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import StatValue from './StatValue.jsx';
import { useSortableTable } from '../hooks/useSortableTable.js';
import { STAT_FIELDS, BENCH } from '../constants.js';
import { formatDate } from '../utils/date.js';

const STAT_COLUMNS = Object.fromEntries(
  STAT_FIELDS.map(([field, label]) => [
    field,
    {
      label,
      getValue: (row) => (typeof row[field] === 'number' ? row[field] : -1),
      render: (row) => <StatValue value={row[field]} />,
    },
  ])
);

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

export default function StatsTable({ rows, columns, sortable = true, onRowClick, wrapClassName, tableClassName }) {
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

  // Tables that surface a wins column default to sorting by wins descending on load.
  const defaultSort = normalizedColumns.some((c) => c.key === 'wins')
    ? { field: 'wins', dir: 'desc' }
    : { field: null, dir: null };

  const { sortedRows, toggleSort, sortIndicator } = useSortableTable(rows, getValue, defaultSort);
  const displayRows = sortable ? sortedRows : rows;
  const showExpandColumn = Boolean(onRowClick);

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
                    <td key={col.key}>{col.render(row)}</td>
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
