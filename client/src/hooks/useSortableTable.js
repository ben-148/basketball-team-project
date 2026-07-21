import { useMemo, useState } from 'react';

// 3-state header cycle: click 1 = descending, click 2 = ascending, click 3 = back to default order.
export function useSortableTable(rows, getValue) {
  const [sort, setSort] = useState({ field: null, dir: null });

  function toggleSort(field) {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: 'desc' };
      if (prev.dir === 'desc') return { field, dir: 'asc' };
      return { field: null, dir: null };
    });
  }

  const sortedRows = useMemo(() => {
    if (!sort.field) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a, sort.field);
      const bv = getValue(b, sort.field);
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (Number(av) - Number(bv)) * dir;
    });
  }, [rows, sort, getValue]);

  function sortIndicator(field) {
    if (sort.field !== field) return null;
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  }

  return { sortedRows, sort, toggleSort, sortIndicator };
}
