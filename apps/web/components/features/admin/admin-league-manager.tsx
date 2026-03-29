'use client';

import { Loader2, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface SeasonDraft {
  name: string;
  slug: string;
  year: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

function createEmptyDraft(): SeasonDraft {
  const now = new Date();
  return {
    name: '',
    slug: '',
    year: now.getFullYear().toString(),
    startDate: '',
    endDate: '',
    isCurrent: false,
  };
}

function toDateValue(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
          : 'border-rose-400/20 bg-rose-500/10 text-rose-100',
      )}
    >
      {feedback.message}
    </div>
  );
}

export function AdminLeagueManager() {
  const utils = api.useUtils();
  const seasonsQuery = api.league.getAllSeasons.useQuery();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [draft, setDraft] = useState<SeasonDraft>(createEmptyDraft);

  const createSeason = api.league.createSeason.useMutation();
  const updateSeason = api.league.updateSeason.useMutation();
  const deleteSeason = api.league.deleteSeason.useMutation();

  const seasons = seasonsQuery.data ?? [];

  function selectSeason(seasonId: string) {
    const season = seasons.find((s) => s.id === seasonId);
    if (season) {
      setSelectedSeasonId(seasonId);
      setDraft({
        name: season.name,
        slug: season.slug,
        year: season.year.toString(),
        startDate: toDateValue(season.startDate),
        endDate: toDateValue(season.endDate),
        isCurrent: season.isCurrent,
      });
      setFeedback(null);
    }
  }

  function handleNew() {
    setSelectedSeasonId(null);
    setDraft(createEmptyDraft());
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const year = Number.parseInt(draft.year, 10);

    try {
      if (selectedSeasonId) {
        await updateSeason.mutateAsync({
          id: selectedSeasonId,
          name: draft.name,
          slug: draft.slug,
          year: Number.isFinite(year) ? year : undefined,
          startDate: draft.startDate ? new Date(draft.startDate) : undefined,
          endDate: draft.endDate ? new Date(draft.endDate) : undefined,
          isCurrent: draft.isCurrent,
        });
        setFeedback({ type: 'success', message: 'La saison a été mise à jour.' });
      } else {
        const created = await createSeason.mutateAsync({
          name: draft.name,
          slug: draft.slug || slugify(draft.name),
          year,
          startDate: new Date(draft.startDate),
          endDate: new Date(draft.endDate),
          isCurrent: draft.isCurrent,
        });
        setSelectedSeasonId(created.id);
        setFeedback({ type: 'success', message: 'La saison a été créée.' });
      }
      await utils.league.getAllSeasons.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'opération a échoué.";
      setFeedback({ type: 'error', message });
    }
  }

  async function handleDelete() {
    if (!selectedSeasonId) return;
    if (!window.confirm('Supprimer cette saison ? Les matchs associés seront affectés.')) return;

    setFeedback(null);
    try {
      await deleteSeason.mutateAsync({ id: selectedSeasonId });
      setSelectedSeasonId(null);
      setDraft(createEmptyDraft());
      await utils.league.getAllSeasons.invalidate();
      setFeedback({ type: 'success', message: 'La saison a été supprimée.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La suppression a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  const mutationPending = createSeason.isPending || updateSeason.isPending || deleteSeason.isPending;

  return (
    <div className="space-y-8">
      <FeedbackBanner feedback={feedback} />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="space-y-5 xl:sticky xl:top-8 xl:h-fit">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-kicker">Registry</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">Saisons</h2>
            </div>
            <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleNew}>
              Nouvelle
            </Button>
          </div>

          <div className="space-y-3">
            {seasonsQuery.isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : seasons.length > 0 ? (
              seasons.map((season) => {
                const active = season.id === selectedSeasonId;
                return (
                  <button
                    key={season.id}
                    type="button"
                    className={cn(
                      'w-full rounded-3xl border p-4 text-left transition',
                      active
                        ? 'border-accent-primary/40 bg-accent-primary/12 shadow-[0_0_30px_rgba(124,58,237,0.12)]'
                        : 'border-white/8 bg-white/5 hover:border-accent-primary/18 hover:bg-white/7',
                    )}
                    onClick={() => selectSeason(season.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{season.name}</p>
                          {season.isCurrent ? (
                            <Star className="h-4 w-4 text-amber-400" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          {formatCompactDate(season.startDate)} → {formatCompactDate(season.endDate)}
                        </p>
                      </div>
                      <Badge variant="actif">{season._count.matches} matchs</Badge>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm text-text-secondary">
                Aucune saison enregistrée.
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-6">
          <div>
            <p className="text-kicker">Season editor</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              {selectedSeasonId ? 'Éditer une saison' : 'Créer une saison'}
            </h2>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Nom</label>
                <Input
                  required
                  placeholder="Ex: Spring 2026"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: slugify(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Slug</label>
                <Input
                  required
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Année</label>
                <Input
                  type="number"
                  required
                  value={draft.year}
                  onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={draft.isCurrent}
                    onChange={(e) => setDraft((d) => ({ ...d, isCurrent: e.target.checked }))}
                  />
                  Saison active (courante)
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Date de début</label>
                <Input
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.18em] text-text-secondary">Date de fin</label>
                <Input
                  type="date"
                  required
                  value={draft.endDate}
                  onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={mutationPending}
                icon={mutationPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              >
                {selectedSeasonId ? 'Mettre à jour' : 'Créer'}
              </Button>
              {selectedSeasonId ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={mutationPending}
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={handleDelete}
                >
                  Supprimer
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
