import { Badge } from '@/components/ui/badge';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { getPlayerInitials } from '@/lib/utils/player-display';
import { formatCurrency } from '@/lib/utils/format';

interface OfferPlayerCardProps {
  player: {
    id: string;
    displayName: string;
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    imageUrl?: string | null | undefined;
    role: string;
    age?: number | null | undefined;
    marketValue: number;
  };
  team?: {
    name: string;
    shortCode: string;
    logoUrl?: string | null | undefined;
  } | null;
  statusLabel: string;
  statusTone?: 'accent' | 'muted' | 'positive';
  contextLabel?: string | null | undefined;
}

const toneClass: Record<NonNullable<OfferPlayerCardProps['statusTone']>, string> = {
  accent: 'text-accent',
  muted: 'text-foreground-muted',
  positive: 'text-[color:var(--win)]',
};

export function OfferPlayerCard({
  player,
  team,
  statusLabel,
  statusTone = 'accent',
  contextLabel,
}: OfferPlayerCardProps) {
  const realName =
    player.firstName || player.lastName
      ? [player.firstName, player.lastName].filter(Boolean).join(' ')
      : null;

  return (
    <aside className="flex flex-col gap-6">
      <div className="placeholder-diag relative aspect-[4/5] w-full overflow-hidden">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.displayName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-5xl text-foreground-dim">
            {getPlayerInitials(player.displayName)}
          </div>
        )}
        {contextLabel ? (
          <span className="absolute left-4 top-4 border border-hairline bg-background/80 px-2 py-1 label-mono text-foreground-muted backdrop-blur-sm">
            {contextLabel}
          </span>
        ) : null}
        {team ? (
          <div className="absolute bottom-4 left-4">
            <TeamAvatar
              name={team.name}
              shortCode={team.shortCode}
              logoUrl={team.logoUrl}
              size="lg"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 label-mono text-foreground-muted">
          <Badge variant={player.role as never}>{player.role}</Badge>
          <span className={toneClass[statusTone]}>{statusLabel}</span>
        </div>
        <h2 className="display-md text-foreground">{player.displayName}</h2>
        <p className="text-sm leading-6 text-foreground-dim">
          {realName ? <span>{realName}</span> : null}
          {realName && player.age ? <span> · </span> : null}
          {player.age ? <span>{player.age} ans</span> : null}
          {(realName || player.age) && team ? <span> · </span> : null}
          {team ? <span>{team.name}</span> : null}
        </p>
        <div className="border-t border-hairline pt-3">
          <p className="label-mono text-foreground-muted">Valeur marchande</p>
          <p className="mt-1 font-display text-xl tabular-nums text-foreground">
            {formatCurrency(player.marketValue)}
          </p>
        </div>
      </div>
    </aside>
  );
}
