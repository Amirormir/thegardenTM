'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';
import { ArrowDown, ArrowUp } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface StatsTableColumn<Row> {
  key: string;
  // Header label
  label: string;
  // How to render the cell. Receives the row and the row index.
  render: (row: Row, index: number) => React.ReactNode;
  // If provided, the column header is clickable to sort by this accessor.
  // Returning null means "missing data" — these rows are pushed to the bottom
  // regardless of sort direction.
  sortAccessor?: (row: Row) => number | string | null;
  // Default direction on first click. Defaults to 'desc' (best first).
  defaultDirection?: SortDirection;
  align?: 'left' | 'right';
  className?: string;
}

export interface StatsTableProps<Row> {
  rows: Row[];
  columns: StatsTableColumn<Row>[];
  // Sticky-first-column when the table scrolls horizontally. Set to false on
  // small tables that fit without horizontal scroll.
  stickyFirstColumn?: boolean;
  // Current sort state. The Champions tab owns its sort key/direction; this
  // component is presentation-only.
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;
  // Unique row id for React keys.
  rowKey: (row: Row, index: number) => string;
  // Empty-state slot.
  emptyState?: React.ReactNode;
}

export function StatsTable<Row>({
  rows,
  columns,
  stickyFirstColumn = true,
  sortKey,
  sortDirection = 'desc',
  onSortChange,
  rowKey,
  emptyState,
}: StatsTableProps<Row>) {
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortAccessor) return rows;
    const accessor = col.sortAccessor;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      // Push nulls to the bottom regardless of direction.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, columns, sortKey, sortDirection]);

  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  function handleHeaderClick(col: StatsTableColumn<Row>) {
    if (!col.sortAccessor || !onSortChange) return;
    const isCurrent = sortKey === col.key;
    const nextDir: SortDirection = isCurrent
      ? sortDirection === 'desc'
        ? 'asc'
        : 'desc'
      : col.defaultDirection ?? 'desc';
    onSortChange(col.key, nextDir);
  }

  return (
    <div className="overflow-x-auto border-t border-hairline">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => {
              const sortable = !!col.sortAccessor && !!onSortChange;
              const isSorted = sortKey === col.key;
              const sticky = stickyFirstColumn && i === 0;
              return (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.align === 'right' && 'text-right',
                    sticky && 'sticky left-0 z-20 bg-background',
                    col.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => handleHeaderClick(col)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors duration-150',
                        isSorted ? 'text-foreground' : 'text-foreground-dim hover:text-foreground',
                      )}
                    >
                      {col.label}
                      {isSorted ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, index) => (
            <TableRow key={rowKey(row, index)}>
              {columns.map((col, i) => {
                const sticky = stickyFirstColumn && i === 0;
                return (
                  <TableCell
                    key={col.key}
                    className={cn(
                      col.align === 'right' && 'text-right',
                      sticky && 'sticky left-0 z-10 bg-background',
                      col.className,
                    )}
                  >
                    {col.render(row, index)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
