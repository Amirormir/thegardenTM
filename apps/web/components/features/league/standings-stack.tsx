import Link from 'next/link';
import type { TeamStanding } from '@nexus/types';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { cn } from '@/lib/utils/cn';

function FormDots({ form }: { form: ('W' | 'L')[] }) {
  if (form.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5" aria-label="Forme récente">
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            r === 'W' ? 'bg-[color:var(--win)]' : 'bg-[color:var(--loss)]/60',
          )}
        />
      ))}
    </div>
  );
}

interface StandingRowProps {
  team: TeamStanding;
  rank: number;
  isLeader: boolean;
  form: ('W' | 'L')[];
}

function StandingRow({ team, rank, isLeader, form }: StandingRowProps) {
  return (
    <Link
      href={`/league/teams/${team.slug}`}
      className={cn(
        'group block border-t border-hairline transition-colors duration-150 hover:bg-surface-hover',
        isLeader && 'border-l-2 border-l-accent',
      )}
    >
      <div
        className={cn(
          'grid items-center gap-4 px-4 py-4 md:gap-6 md:px-5 md:py-5',
          'grid-cols-[2.5rem_auto_1fr_auto] md:grid-cols-[2.5rem_auto_1fr_auto_auto_auto]',
        )}
      >
        <span
          className={cn(
            'font-display text-3xl leading-none tabular-nums md:text-4xl',
            isLeader ? 'text-accent' : 'text-foreground-muted',
          )}
        >
          {rank.toString().padStart(2, '0')}
        </span>

        <TeamAvatar
          name={team.name}
          shortCode={team.shortCode}
          logoUrl={team.logoUrl}
          size="md"
          className="md:h-11 md:w-11"
        />

        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-display tracking-tight text-foreground',
              isLeader ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
            )}
          >
            {team.name}
          </p>
          <div className="mt-1 flex items-center gap-3 label-mono">
            <span>{team.shortCode}</span>
            {form.length > 0 ? (
              <>
                <span className="h-2.5 w-px bg-hairline" />
                <FormDots form={form} />
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-sm tabular-nums text-foreground-dim">
            {team.wins}–{team.losses}
          </p>
          <p className="mt-1 label-mono">Bilan</p>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-sm tabular-nums text-foreground-dim">
            {team.mapWins}–{team.mapLosses}
          </p>
          <p className="mt-1 label-mono">Maps</p>
        </div>

        <div className="text-right">
          <p
            className={cn(
              'font-display tabular-nums tracking-tight',
              isLeader ? 'text-3xl text-accent md:text-4xl' : 'text-2xl text-foreground md:text-3xl',
            )}
          >
            {team.points}
          </p>
          <p className="mt-1 label-mono">Pts</p>
        </div>
      </div>
    </Link>
  );
}

export interface StandingsStackProps {
  standings: TeamStanding[];
  recentForm?: Record<string, ('W' | 'L')[]>;
}

export function StandingsStack({ standings, recentForm = {} }: StandingsStackProps) {
  return (
    <div className="border-b border-hairline">
      {standings.map((team, index) => (
        <StandingRow
          key={team.id}
          team={team}
          rank={index + 1}
          isLeader={index === 0}
          form={recentForm[team.id] ?? []}
        />
      ))}
    </div>
  );
}
