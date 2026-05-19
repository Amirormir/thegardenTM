'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamAvatar } from '@/components/ui/team-avatar';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

type BlueSide = 'HOME' | 'AWAY';

interface FeedbackState {
  type: 'error';
  message: string;
}

function maxGames(format: 'BO1' | 'BO3' | 'BO5'): number {
  if (format === 'BO5') return 5;
  if (format === 'BO3') return 3;
  return 1;
}

export function DraftCreateForm() {
  const router = useRouter();
  const matchesQuery = api.draft.eligibleMatches.useQuery();
  const createDraft = api.draft.create.useMutation();

  const [matchId, setMatchId] = useState<string>('');
  const [gameNumber, setGameNumber] = useState<number>(1);
  const [blueSide, setBlueSide] = useState<BlueSide>('HOME');
  const [fearless, setFearless] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const matches = matchesQuery.data ?? [];
  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === matchId) ?? null,
    [matches, matchId],
  );

  const maxGameNumber = selectedMatch ? maxGames(selectedMatch.format) : 1;
  const usedGameNumbers = useMemo(() => {
    if (!selectedMatch) return new Set<number>();
    return new Set(
      selectedMatch.drafts
        .filter((d) => d.status !== 'CANCELLED')
        .map((d) => d.gameNumber),
    );
  }, [selectedMatch]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!matchId) {
      setFeedback({ type: 'error', message: 'Sélectionne un match.' });
      return;
    }

    try {
      const draft = await createDraft.mutateAsync({
        matchId,
        gameNumber,
        blueSide,
        fearless,
      });
      router.push(`/draft/${draft.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Création échouée.';
      setFeedback({ type: 'error', message });
    }
  }

  if (matchesQuery.isLoading) {
    return (
      <div className="flex items-center gap-3 border border-hairline bg-surface px-5 py-6 text-sm text-foreground-dim">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des matchs éligibles…
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="border border-hairline bg-surface px-5 py-6">
        <p className="text-sm text-foreground-dim">
          Aucun match en cours ou planifié dans le split courant. Crée un match dans le
          back-office avant de planifier un draft.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="label-mono">§ Match</p>
        <ul className="grid gap-3">
          {matches.map((match) => {
            const selected = matchId === match.id;
            return (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMatchId(match.id);
                    setGameNumber(1);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 border px-4 py-3 text-left transition-colors duration-150',
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-hairline bg-surface hover:bg-surface-hover',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TeamAvatar
                      name={match.homeTeam.name}
                      shortCode={match.homeTeam.shortCode}
                      logoUrl={match.homeTeam.logoUrl}
                      size="sm"
                    />
                    <span className="text-sm text-foreground">{match.homeTeam.name}</span>
                    <span className="label-mono text-foreground-muted">vs</span>
                    <TeamAvatar
                      name={match.awayTeam.name}
                      shortCode={match.awayTeam.shortCode}
                      logoUrl={match.awayTeam.logoUrl}
                      size="sm"
                    />
                    <span className="text-sm text-foreground">{match.awayTeam.name}</span>
                  </div>
                  <span className="label-mono text-foreground-muted tabular-nums">
                    {match.format} ·{' '}
                    {new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selectedMatch ? (
        <>
          <section className="flex flex-col gap-4">
            <p className="label-mono">§ Numéro de partie</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: maxGameNumber }, (_, i) => i + 1).map((num) => {
                const taken = usedGameNumbers.has(num);
                const active = gameNumber === num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={taken}
                    onClick={() => setGameNumber(num)}
                    className={cn(
                      'border px-4 py-2 text-sm transition-colors duration-150 tabular-nums',
                      taken
                        ? 'cursor-not-allowed border-hairline bg-surface text-foreground-muted line-through'
                        : active
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-hairline bg-surface text-foreground-dim hover:bg-surface-hover',
                    )}
                  >
                    G{num}
                    {taken ? ' · pris' : ''}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <p className="label-mono">§ Côté Blue</p>
            <div className="flex flex-wrap gap-2">
              {(['HOME', 'AWAY'] as BlueSide[]).map((side) => {
                const team = side === 'HOME' ? selectedMatch.homeTeam : selectedMatch.awayTeam;
                const active = blueSide === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setBlueSide(side)}
                    className={cn(
                      'flex items-center gap-3 border px-4 py-2.5 text-sm transition-colors duration-150',
                      active
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-hairline bg-surface text-foreground-dim hover:bg-surface-hover',
                    )}
                  >
                    <TeamAvatar
                      name={team.name}
                      shortCode={team.shortCode}
                      logoUrl={team.logoUrl}
                      size="xs"
                    />
                    {team.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <p className="label-mono">§ Mode</p>
            <label className="inline-flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={fearless}
                onChange={(e) => setFearless(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--accent)]"
              />
              Fearless (les picks restent verrouillés sur les parties suivantes)
            </label>
          </section>
        </>
      ) : null}

      {feedback ? (
        <div className="border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-[color:var(--loss)]">
          {feedback.message}
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-hairline pt-6">
        <Button
          type="submit"
          disabled={!matchId || createDraft.isPending}
          className="inline-flex items-center gap-2"
        >
          {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Créer le draft
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/draft')}
          disabled={createDraft.isPending}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
