import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RosterTable } from '@/components/features/team/roster-table';
import { SquadChampionPool } from '@/components/features/team/squad-champion-pool';
import { SquadPlayerCard } from '@/components/features/team/squad-player-card';
import { SquadRecentMatches } from '@/components/features/team/squad-recent-matches';
import { TeamTabs } from '@/components/features/team/team-tabs';
import { TransferOffers } from '@/components/features/team/transfer-offers';
import { buttonVariants } from '@/components/ui/button';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';

interface KpiBlockProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiBlock({ label, value, hint }: KpiBlockProps) {
  return (
    <div className="border-l border-hairline pl-5 first:border-l-0 first:pl-0">
      <p className="label-mono">{label}</p>
      <p className="mt-3 font-display text-3xl tabular-nums text-foreground md:text-4xl">{value}</p>
      {hint ? <p className="mt-2 label-mono text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

export default async function TeamDashboardPage() {
  const session = await auth();
  const teamId = session?.user?.teamId;

  if (!teamId) {
    redirect('/');
  }

  const caller = await getServerCaller();
  const [team, activity] = await Promise.all([
    caller.team.getById({ id: teamId }),
    caller.team.getRecentActivity({ teamId }),
  ]);

  const totalMarketValue = team.players.reduce((sum, player) => sum + player.marketValue, 0);
  const totalSalary = team.players.reduce((sum, player) => sum + player.salary, 0);
  const salaryCapUsagePct = team.salaryBudgetCap > 0
    ? Math.round((totalSalary / team.salaryBudgetCap) * 100)
    : 0;
  const salaryRemaining = team.salaryBudgetCap - totalSalary;

  const activeRoster = team.players.filter((p) => p.isActive);

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <header className="flex flex-col gap-8 border-b border-hairline pb-8">
        <TeamTabs />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <TeamAvatar
              name={team.name}
              shortCode={team.shortCode}
              logoUrl={team.logoUrl}
              size="lg"
              className="!h-20 !w-20"
            />
            <div>
              <p className="breadcrumb-mono">§ · Équipe · Effectif</p>
              <h1 className="mt-2 display-lg text-foreground">{team.name}.</h1>
            </div>
          </div>
          <Link
            href="/team/contracts"
            className={cn(buttonVariants({ variant: 'secondary' }), 'self-start md:self-center')}
          >
            Espace contrats
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-8 border-y border-hairline py-8 md:grid-cols-4 md:gap-12">
        <KpiBlock label="Roster" value={activeRoster.length.toString().padStart(2, '0')} hint="joueurs actifs" />
        <KpiBlock label="Market value" value={formatCurrency(totalMarketValue)} hint="total effectif" />
        <KpiBlock
          label="Marge salariale"
          value={formatCurrency(salaryRemaining)}
          hint={`${salaryCapUsagePct}% de la masse utilisée`}
        />
        <KpiBlock
          label="Budget transfert"
          value={formatCurrency(team.transferBudget)}
          hint="cash disponible"
        />
      </section>

      <section>
        <p className="label-mono">§ 01 Effectif</p>
        <h2 className="mt-3 display-md text-foreground">Starting five.</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
          Cliquez sur un joueur pour ouvrir sa fiche complète.
        </p>
        {activeRoster.length === 0 ? (
          <p className="mt-8 border-y border-hairline bg-surface px-5 py-4 label-mono text-foreground-muted">
            Aucun joueur actif. Signez votre premier joueur depuis le transfermarket.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {activeRoster.map((player) => (
              <li key={player.id}>
                <SquadPlayerCard
                  player={{
                    id: player.id,
                    displayName: player.displayName,
                    imageUrl: player.imageUrl,
                    role: player.role,
                    teamRole: player.teamRole,
                  }}
                  stats={activity.playerStats[player.id] ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <p className="label-mono">§ 02 Derniers résultats</p>
          <h2 className="mt-3 display-md text-foreground">5 dernières games.</h2>
          <div className="mt-6">
            <SquadRecentMatches matches={activity.recentMatches} teamId={teamId} />
          </div>
        </div>
        <div>
          <p className="label-mono">§ 03 Champion pool</p>
          <h2 className="mt-3 display-md text-foreground">Picks récents.</h2>
          <div className="mt-6">
            <SquadChampionPool champions={activity.championPool} />
          </div>
        </div>
      </section>

      <section>
        <p className="label-mono">§ 04 Rôles équipe</p>
        <h2 className="mt-3 display-md text-foreground">Assignation in-game.</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-dim">
          Modifiez le rôle équipe de chaque joueur. Le rôle originel reste visible sur sa fiche.
        </p>
        <div className="mt-8 border-t border-hairline">
          <RosterTable
            players={team.players.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              role: p.role,
              teamRole: p.teamRole,
              salary: p.salary,
              marketValue: p.marketValue,
            }))}
            teamId={teamId}
          />
        </div>
      </section>

      <section>
        <p className="label-mono">§ 05 Marché</p>
        <h2 className="mt-3 display-md text-foreground">Offres de transfert.</h2>
        <div className="mt-8">
          <TransferOffers teamId={teamId} />
        </div>
      </section>
    </div>
  );
}
