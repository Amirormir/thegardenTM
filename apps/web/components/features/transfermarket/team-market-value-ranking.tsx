import type { TeamMarketValueEntry } from '@nexus/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { TeamTintCard } from '@/components/ui/team-tint';
import { formatCurrency } from '@/lib/utils/format';

interface TeamMarketValueRankingProps {
  teams: TeamMarketValueEntry[];
}

export function TeamMarketValueRanking({ teams }: TeamMarketValueRankingProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {teams.map((team, index) => (
        <TeamTintCard
          key={team.id}
          logoUrl={team.logoUrl}
          className="h-full"
          contentClassName="space-y-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-center">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">Rank</p>
                <p className="font-display text-2xl font-bold text-white">#{index + 1}</p>
              </div>
              <TeamAvatar
                name={team.name}
                shortCode={team.shortCode}
                logoUrl={team.logoUrl}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-bold text-white">{team.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/62">
                  {team.shortCode} / {team.playerCount} joueurs
                </p>
              </div>
            </div>

            <Link
              href={`/league/teams/${team.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              Fiche
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">
                Valeur totale
              </p>
              <p className="mt-2 font-semibold text-white">{formatCurrency(team.totalMarketValue)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">
                Moyenne
              </p>
              <p className="mt-2 font-semibold text-white">
                {formatCurrency(team.averageMarketValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/58">
                Payroll
              </p>
              <p className="mt-2 font-semibold text-white">{formatCurrency(team.totalSalary)}</p>
            </div>
          </div>
        </TeamTintCard>
      ))}
    </div>
  );
}
