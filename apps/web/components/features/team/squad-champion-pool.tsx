interface SquadChampionPoolProps {
  champions: Array<{
    champion: string;
    games: number;
    wins: number;
    winRate: number;
  }>;
}

export function SquadChampionPool({ champions }: SquadChampionPoolProps) {
  if (champions.length === 0) {
    return (
      <p className="label-mono text-foreground-muted">
        Aucune game enregistrée pour le moment.
      </p>
    );
  }

  return (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {champions.map((entry) => {
        const winPct = Math.round(entry.winRate * 100);
        return (
          <li
            key={entry.champion}
            className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2"
          >
            <span className="label-mono text-foreground">{entry.champion}</span>
            <span className="flex items-baseline gap-3 text-xs">
              <span className="font-display tabular-nums text-foreground-muted">
                {entry.games}g
              </span>
              <span
                className="font-display tabular-nums"
                style={{ color: winPct >= 50 ? 'var(--win)' : 'var(--foreground-muted)' }}
              >
                {winPct}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
