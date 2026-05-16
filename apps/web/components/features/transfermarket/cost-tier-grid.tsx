import type { PlayerListItem } from '@nexus/types';
import { Badge } from '@/components/ui/badge';
import { PlayerLink } from '@/components/ui/player-link';
import { TeamInline } from '@/components/ui/team-inline';
import { buildPlayerRiotId, getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';

const COST_TIERS = [5, 4, 3, 2, 1] as const;

export interface CostTierGridProps {
  players: PlayerListItem[];
}

export function CostTierGrid({ players }: CostTierGridProps) {
  const grouped = new Map<number, PlayerListItem[]>();
  for (const tier of COST_TIERS) {
    grouped.set(tier, []);
  }

  for (const player of players) {
    const tier = player.cost ?? 1;
    const bucket = grouped.get(tier);
    if (bucket) {
      bucket.push(player);
    }
  }

  return (
    <div className="flex flex-col gap-16">
      {COST_TIERS.map((tier) => {
        const tierPlayers = grouped.get(tier) ?? [];

        return (
          <section key={tier} className="flex flex-col gap-6">
            <header className="flex items-baseline justify-between gap-4 border-b border-hairline pb-3">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl tabular-nums leading-none text-foreground">
                  {tier}
                </span>
                <p className="label-mono">Cost {tier}</p>
              </div>
              <p className="label-mono tabular-nums">
                {tierPlayers.length.toString().padStart(2, '0')} joueur
                {tierPlayers.length > 1 ? 's' : ''}
              </p>
            </header>

            {tierPlayers.length > 0 ? (
              <div className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tierPlayers.map((player) => (
                  <CostPlayerCard key={player.id} player={player} />
                ))}
              </div>
            ) : (
              <p className="border-y border-hairline bg-background py-6 text-sm text-foreground-dim">
                Aucun joueur dans ce palier pour les filtres actuels.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CostPlayerCard({ player }: { player: PlayerListItem }) {
  const riotId = buildPlayerRiotId(player);

  return (
    <article className="flex h-full flex-col gap-4 bg-background px-4 py-4 transition-colors duration-150 hover:bg-surface-hover">
      <div className="flex items-center gap-2">
        <Badge variant={player.role}>{player.role}</Badge>
        {player.secondaryRoles?.map((secondaryRole) => (
          <Badge key={secondaryRole} variant={secondaryRole}>
            {secondaryRole}
          </Badge>
        ))}
      </div>

      <div className="flex items-start gap-3">
        <div className="placeholder-diag h-14 w-14 shrink-0 overflow-hidden">
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.displayName}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-base text-foreground-dim">
              {getPlayerInitials(player.displayName)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <PlayerLink
            playerId={player.id}
            className="block truncate font-display text-xl tracking-tight text-foreground"
          >
            {player.displayName}
          </PlayerLink>
          <p className="mt-1 truncate label-mono" title={riotId}>
            {riotId}
          </p>
          <div className="mt-2" title={player.teamName}>
            <TeamInline
              name={player.teamName}
              shortCode={player.teamShortCode ?? 'FA'}
              logoUrl={player.teamLogoUrl}
              size="xs"
              className="max-w-full"
              text={`${player.teamShortCode ?? 'FA'} · ${player.teamName}`}
              textClassName="text-sm text-foreground-dim"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3 label-mono tabular-nums">
        <span>{formatCurrency(player.marketValue)}</span>
        <span className="text-foreground-muted">Cost {player.cost ?? 1}</span>
      </div>
    </article>
  );
}
