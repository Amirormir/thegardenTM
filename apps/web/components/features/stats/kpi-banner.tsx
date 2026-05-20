'use client';

interface KpiTile {
  label: string;
  value: string | number;
  hint?: string | undefined;
}

interface KpiBannerProps {
  tiles: KpiTile[];
  isLoading?: boolean;
}

/**
 * Numeric overview strip shown at the top of /league/stats. Surfaces the gap
 * between draft data (always present) and parsed replays so users can read the
 * rest of the page knowing where "—" cells come from.
 */
export function KpiBanner({ tiles, isLoading = false }: KpiBannerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
        {Array.from({ length: tiles.length || 4 }).map((_, i) => (
          <div key={i} className="bg-background px-5 py-4">
            <div className="h-3 w-16 animate-pulse bg-surface-hover" />
            <div className="mt-3 h-6 w-12 animate-pulse bg-surface-hover" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-background px-5 py-4">
          <p className="label-mono text-foreground-dim">§ {tile.label}</p>
          <p className="mt-2 font-display text-2xl text-foreground tabular-nums">
            {tile.value}
          </p>
          {tile.hint ? (
            <p className="mt-1 text-xs text-foreground-muted">{tile.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
