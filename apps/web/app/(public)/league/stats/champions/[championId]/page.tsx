import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { PlayerLink } from '@/components/ui/player-link';
import { getChampionSplashUrl } from '@/lib/utils/ddragon';
import { getServerCaller } from '@/server/caller';

export const revalidate = 60;

interface ChampionDetailPageProps {
  params: Promise<{ championId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}

function formatRate(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="border border-hairline bg-background px-5 py-4">
      <p className="label-mono text-foreground-dim">§ {label}</p>
      <p className="mt-2 font-display text-2xl text-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

export default async function ChampionDetailPage({
  params,
  searchParams,
}: ChampionDetailPageProps) {
  const { championId } = await params;
  const { seasonId: querySeasonId } = await searchParams;

  const caller = await getServerCaller();
  const [seasons, currentSeason] = await Promise.all([
    caller.league.getAllSeasons(),
    caller.league.getCurrentSeason(),
  ]);

  const targetSeasonId = querySeasonId ?? currentSeason?.id ?? seasons[0]?.id;
  if (!targetSeasonId) notFound();

  const detail = await caller.stats.getChampionDetail({
    seasonId: targetSeasonId,
    championId,
  });

  const activeSeason = seasons.find((s) => s.id === targetSeasonId) ?? seasons[0];

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      <header className="relative isolate overflow-hidden border-b border-hairline">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${getChampionSplashUrl(championId)})` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/40"
        />
        <div className="flex flex-col gap-6 px-6 py-16 md:px-12">
          <p className="breadcrumb-mono">
            <Link href="/league/stats" className="hover:text-foreground">
              § 05 · Statistiques
            </Link>{' '}
            / Champions / {championId}
          </p>
          <h1 className="display-xl text-foreground">{championId}</h1>
          {activeSeason ? (
            <p className="text-sm text-foreground-dim">
              Saison {activeSeason.name}
              {activeSeason.isCurrent ? ' · en cours' : ''}
            </p>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
        <KpiTile label="Présence" value={formatRate(detail.presenceRate)} />
        <KpiTile
          label="Picks · Bans"
          value={`${detail.pickCount} · ${detail.banCount}`}
        />
        <KpiTile
          label="Win% draft"
          value={formatRate(detail.winRate)}
          hint={`${detail.winCount} W · ${detail.lossCount} L`}
        />
        <KpiTile
          label="Drafts saison"
          value={detail.totalDrafts.toString()}
          hint={
            detail.totalDrafts > 0
              ? `${detail.pickCount + detail.banCount} actions`
              : undefined
          }
        />
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="border border-hairline p-6">
          <p className="label-mono">§ Côté bleu</p>
          <p className="mt-3 display-md text-foreground tabular-nums">
            {formatRate(detail.blueSide.winRate)}
          </p>
          <p className="mt-1 text-sm text-foreground-dim tabular-nums">
            {detail.blueSide.wins} W / {detail.blueSide.picks - detail.blueSide.wins} L · {detail.blueSide.picks} picks
          </p>
        </div>
        <div className="border border-hairline p-6">
          <p className="label-mono">§ Côté rouge</p>
          <p className="mt-3 display-md text-foreground tabular-nums">
            {formatRate(detail.redSide.winRate)}
          </p>
          <p className="mt-1 text-sm text-foreground-dim tabular-nums">
            {detail.redSide.wins} W / {detail.redSide.picks - detail.redSide.wins} L · {detail.redSide.picks} picks
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <header className="flex items-end justify-between gap-4 border-b border-hairline pb-4">
          <h2 className="display-md text-foreground">Performance replay</h2>
          {detail.performance ? (
            <p className="label-mono">§ {detail.performance.games} games parsés</p>
          ) : null}
        </header>
        {detail.performance ? (
          <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
            <KpiTile label="KDA" value={detail.performance.kda.toFixed(2)} />
            <KpiTile label="CS/min" value={detail.performance.avgCsPerMin.toFixed(1)} />
            <KpiTile label="Gold/min" value={detail.performance.avgGoldPerMin.toFixed(0)} />
            <KpiTile label="Dmg/min" value={detail.performance.avgDamagePerMin.toFixed(0)} />
            <KpiTile
              label="K/D/A"
              value={`${detail.performance.avgKills.toFixed(1)} / ${detail.performance.avgDeaths.toFixed(1)} / ${detail.performance.avgAssists.toFixed(1)}`}
            />
            <KpiTile label="KP%" value={`${(detail.performance.avgKillParticipation * 100).toFixed(0)}%`} />
            <KpiTile label="Dmg share" value={`${(detail.performance.avgDamageShare * 100).toFixed(0)}%`} />
          </div>
        ) : (
          <div className="border border-hairline bg-surface px-5 py-6">
            <p className="text-sm text-foreground-dim">
              Aucun replay parsé n&apos;utilise ce champion cette saison.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <header className="flex items-end justify-between gap-4 border-b border-hairline pb-4">
          <h2 className="display-md text-foreground">Joueurs principaux</h2>
        </header>
        {detail.topPlayers.length > 0 ? (
          <ul className="flex flex-col">
            {detail.topPlayers.map((p, i) => (
              <li
                key={p.playerId}
                className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_5rem_5rem_5rem] items-baseline gap-3 border-t border-hairline py-4 first:border-t-0"
              >
                <span className="font-display tabular-nums text-foreground-muted">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <PlayerLink playerId={p.playerId} className="font-display text-foreground">
                  {p.displayName}
                </PlayerLink>
                <Badge variant={p.role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'}>
                  {p.role}
                </Badge>
                <span className="label-mono tabular-nums">{p.teamShortCode}</span>
                <span className="tabular-nums">{p.games} games</span>
                <span className="font-display tabular-nums text-accent">
                  {formatRate(p.winRate)} · {p.kda.toFixed(2)} KDA
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-hairline bg-surface px-5 py-6">
            <p className="text-sm text-foreground-dim">
              Aucun joueur n&apos;a encore joué ce champion sur un replay parsé.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <header className="flex items-end justify-between gap-4 border-b border-hairline pb-4">
          <h2 className="display-md text-foreground">Picks récents</h2>
        </header>
        {detail.recentPicks.length > 0 ? (
          <ul className="flex flex-col">
            {detail.recentPicks.map((p) => (
              <li
                key={p.draftId}
                className="grid grid-cols-[4rem_minmax(0,1fr)_3rem_5rem_6rem] items-baseline gap-3 border-t border-hairline py-3 first:border-t-0"
              >
                <span className="label-mono">G{p.gameNumber}</span>
                <span className="font-display text-foreground">
                  <span className={p.pickedSide === 'BLUE' ? 'text-foreground' : 'text-foreground-dim'}>
                    {p.blueTeamShortCode}
                  </span>
                  <span className="mx-2 text-foreground-muted">vs</span>
                  <span className={p.pickedSide === 'RED' ? 'text-foreground' : 'text-foreground-dim'}>
                    {p.redTeamShortCode}
                  </span>
                </span>
                <span className="label-mono">{p.pickedSide}</span>
                <span
                  className={
                    p.result === 'WIN'
                      ? 'font-display tabular-nums text-accent'
                      : p.result === 'LOSS'
                        ? 'font-display tabular-nums text-foreground-dim'
                        : 'label-mono'
                  }
                >
                  {p.result}
                </span>
                <span className="text-xs text-foreground-muted tabular-nums">
                  {formatDate(p.lockedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-hairline bg-surface px-5 py-6">
            <p className="text-sm text-foreground-dim">
              Pas de pick enregistré pour ce champion cette saison.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
