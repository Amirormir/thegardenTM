import { ChampionIcon } from '@/components/ui/champion-icon';

export interface ChampionPoolEntry {
  champion: string;
  games: number;
  winRate: number;
  kda: number;
  avgDamage: number;
  poolShare: number;
  damageShare: number;
}

function championHue(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function ChampionPoolMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-tight tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ChampionPoolGrid({ champions }: { champions: ChampionPoolEntry[] }) {
  if (champions.length === 0) {
    return (
      <div className="border border-hairline bg-surface px-5 py-6">
        <p className="text-sm leading-6 text-foreground-dim">
          Aucune statistique champion n&apos;est encore stockée pour ce joueur.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-px border-t border-hairline bg-hairline md:grid-cols-2 xl:grid-cols-4">
      {champions.map((champion, index) => {
        const hue = championHue(champion.champion);
        const accentColor = `oklch(0.72 0.14 ${hue})`;
        const poolShare = Math.min(100, Math.max(champion.poolShare * 100, 4));

        return (
          <article key={champion.champion} className="bg-background px-5 py-5 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <ChampionIcon
                  championId={champion.champion}
                  size="lg"
                  className="h-14 w-14 shrink-0 border border-hairline md:h-16 md:w-16"
                />
                <div className="min-w-0">
                  <h3 className="truncate font-display text-2xl tracking-tight text-foreground">
                    {champion.champion}
                  </h3>
                  <p className="mt-1 label-mono text-foreground-dim">
                    {champion.games} partie{champion.games > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <p className="label-mono text-foreground-muted">#{index + 1}</p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <ChampionPoolMetric
                label="WR"
                value={`${(champion.winRate * 100).toFixed(1)}%`}
              />
              <ChampionPoolMetric label="KDA" value={champion.kda.toFixed(1)} />
              <ChampionPoolMetric
                label="DMG %"
                value={`${(champion.damageShare * 100).toFixed(1)}%`}
              />
            </div>

            <div className="mt-6 h-px w-full bg-hairline">
              <div
                className="h-px"
                style={{
                  width: `${poolShare}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="label-mono text-foreground-muted">
                {(champion.poolShare * 100).toFixed(1)}% du pool
              </p>
              <p className="label-mono text-foreground-muted">
                {Math.round(champion.avgDamage).toLocaleString('fr-FR')} dmg
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
