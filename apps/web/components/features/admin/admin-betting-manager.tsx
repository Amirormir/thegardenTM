'use client';

import { GripVertical, Loader2, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCompactDate, formatCurrency } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface OrderableTeam {
  teamId: string;
  name: string;
  shortCode: string;
  rating: number | null;
  gamesPlayed: number;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'text-foreground-dim',
  WON: 'text-[color:var(--win)]',
  LOST: 'text-[color:var(--loss)]',
  VOID: 'text-foreground-muted',
};

type ConfigForm = {
  margin: string;
  k: string;
  warmupGames: string;
  seedRatingMin: string;
  seedRatingMax: string;
  probClampMin: string;
  probClampMax: string;
  minStake: string;
  maxStake: string;
  allowSelfTeamBets: boolean;
};

export function AdminBettingManager() {
  const utils = api.useUtils();
  const seasonsQuery = api.league.getAllSeasons.useQuery();
  const [seasonId, setSeasonId] = useState<string>('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Default to the current season once seasons load.
  useEffect(() => {
    if (!seasonId && seasonsQuery.data && seasonsQuery.data.length > 0) {
      const current = seasonsQuery.data.find((s) => s.isCurrent) ?? seasonsQuery.data[0];
      if (current) setSeasonId(current.id);
    }
  }, [seasonsQuery.data, seasonId]);

  const ratingsQuery = api.admin.betting.getRatings.useQuery(
    { seasonId },
    { enabled: Boolean(seasonId) },
  );
  const configQuery = api.admin.betting.getConfig.useQuery(
    { seasonId },
    { enabled: Boolean(seasonId) },
  );
  const betsQuery = api.admin.betting.listBets.useQuery(
    { seasonId, limit: 100 },
    { enabled: Boolean(seasonId) },
  );

  const seedMutation = api.admin.betting.seedRatings.useMutation();
  const overrideMutation = api.admin.betting.overrideRating.useMutation();
  const configMutation = api.admin.betting.updateConfig.useMutation();
  const voidMutation = api.admin.betting.voidBetsForMatch.useMutation();

  // --- Seeding state ---
  const [ordered, setOrdered] = useState<OrderableTeam[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!ratingsQuery.data) return;
    const sorted = [...ratingsQuery.data].sort((a, b) => {
      if (a.rating !== null && b.rating !== null) return b.rating - a.rating;
      if (a.rating !== null) return -1;
      if (b.rating !== null) return 1;
      return a.name.localeCompare(b.name);
    });
    setOrdered(
      sorted.map((t) => ({
        teamId: t.teamId,
        name: t.name,
        shortCode: t.shortCode,
        rating: t.rating,
        gamesPlayed: t.gamesPlayed,
      })),
    );
    setOverrides({});
  }, [ratingsQuery.data]);

  // --- Config state ---
  const [config, setConfig] = useState<ConfigForm | null>(null);
  useEffect(() => {
    if (!configQuery.data) return;
    const c = configQuery.data;
    setConfig({
      margin: String(c.margin),
      k: String(c.k),
      warmupGames: String(c.warmupGames),
      seedRatingMin: String(c.seedRatingMin),
      seedRatingMax: String(c.seedRatingMax),
      probClampMin: String(c.probClampMin),
      probClampMax: String(c.probClampMax),
      minStake: String(c.minStake),
      maxStake: c.maxStake === null ? '' : String(c.maxStake),
      allowSelfTeamBets: c.allowSelfTeamBets,
    });
  }, [configQuery.data]);

  function reorder(from: number, to: number) {
    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  }

  async function refreshSeason() {
    await Promise.all([
      utils.admin.betting.getRatings.invalidate({ seasonId }),
      utils.admin.betting.getConfig.invalidate({ seasonId }),
      utils.admin.betting.listBets.invalidate({ seasonId, limit: 100 }),
    ]);
  }

  async function handleSeed() {
    setFeedback(null);
    const parsedOverrides: Record<string, number> = {};
    for (const [teamId, value] of Object.entries(overrides)) {
      const num = Number.parseFloat(value);
      if (value.trim() !== '' && Number.isFinite(num)) parsedOverrides[teamId] = num;
    }
    try {
      await seedMutation.mutateAsync({
        seasonId,
        orderedTeamIds: ordered.map((t) => t.teamId),
        ...(Object.keys(parsedOverrides).length > 0 ? { overrides: parsedOverrides } : {}),
      });
      await refreshSeason();
      setFeedback({ type: 'success', message: 'Ratings de présaison générés.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Échec du seeding.',
      });
    }
  }

  async function handleOverride(teamId: string) {
    setFeedback(null);
    const num = Number.parseFloat(overrides[teamId] ?? '');
    if (!Number.isFinite(num)) {
      setFeedback({ type: 'error', message: 'Rating invalide.' });
      return;
    }
    try {
      await overrideMutation.mutateAsync({ teamId, seasonId, rating: num });
      await refreshSeason();
      setFeedback({ type: 'success', message: 'Rating ajusté.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Échec de l\'ajustement.',
      });
    }
  }

  async function handleSaveConfig() {
    if (!config) return;
    setFeedback(null);
    try {
      await configMutation.mutateAsync({
        seasonId,
        margin: Number.parseFloat(config.margin),
        k: Number.parseFloat(config.k),
        warmupGames: Number.parseInt(config.warmupGames, 10),
        seedRatingMin: Number.parseFloat(config.seedRatingMin),
        seedRatingMax: Number.parseFloat(config.seedRatingMax),
        probClampMin: Number.parseFloat(config.probClampMin),
        probClampMax: Number.parseFloat(config.probClampMax),
        minStake: Number.parseInt(config.minStake, 10),
        maxStake: config.maxStake.trim() === '' ? null : Number.parseInt(config.maxStake, 10),
        allowSelfTeamBets: config.allowSelfTeamBets,
      });
      await refreshSeason();
      setFeedback({ type: 'success', message: 'Réglages enregistrés.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Échec de l\'enregistrement.',
      });
    }
  }

  async function handleVoid(matchId: string) {
    if (!window.confirm('Annuler tous les paris en cours de ce match et rembourser les mises ?')) {
      return;
    }
    setFeedback(null);
    try {
      const result = await voidMutation.mutateAsync({ matchId });
      await refreshSeason();
      setFeedback({
        type: 'success',
        message: `${result.voidedCount} pari(s) remboursé(s).`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Échec du remboursement.',
      });
    }
  }

  const bets = betsQuery.data ?? [];
  const seasons = seasonsQuery.data ?? [];
  const busy =
    seedMutation.isPending ||
    overrideMutation.isPending ||
    configMutation.isPending ||
    voidMutation.isPending;

  const seedBounds = useMemo(() => {
    const min = config ? Number.parseFloat(config.seedRatingMin) : 1300;
    const max = config ? Number.parseFloat(config.seedRatingMax) : 1700;
    return { min, max };
  }, [config]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-4">
        <label className="label-mono text-foreground-dim">Saison</label>
        <div className="w-64">
          <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.isCurrent ? ' (en cours)' : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {feedback ? (
        <div
          className={cn(
            'border-l-2 border-y border-r border-hairline bg-surface px-5 py-3 label-mono',
            feedback.type === 'success'
              ? 'border-l-[color:var(--win)] text-[color:var(--win)]'
              : 'border-l-[color:var(--loss)] text-[color:var(--loss)]',
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* --- Seeding --- */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-xl tracking-tight text-white">Seeding de présaison</h2>
          <p className="mt-2 text-sm text-foreground-dim">
            Ordonne les équipes de la plus favorite (haut) à la moins favorite. Les ratings sont
            répartis entre {Number.isFinite(seedBounds.min) ? seedBounds.min : 1300} et{' '}
            {Number.isFinite(seedBounds.max) ? seedBounds.max : 1700}. L&apos;override force le
            rating d&apos;une équipe.
          </p>
        </div>

        {ratingsQuery.isLoading ? (
          <div className="flex items-center gap-3 label-mono text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <ol className="flex flex-col divide-y divide-hairline border border-hairline">
            {ordered.map((team, index) => (
              <li
                key={team.teamId}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndex === null || dragIndex === index) return;
                  reorder(dragIndex, index);
                  setDragIndex(index);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  'flex items-center gap-3 bg-surface px-4 py-3',
                  dragIndex === index && 'opacity-60',
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-foreground-muted" />
                <span className="w-6 font-mono tabular-nums text-foreground-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
                  <p className="label-mono text-foreground-muted">
                    {team.shortCode} · rating{' '}
                    <span className="font-mono">
                      {team.rating !== null ? team.rating.toFixed(0) : '—'}
                    </span>{' '}
                    · {team.gamesPlayed} BO
                  </p>
                </div>
                <div className="w-28">
                  <Input
                    placeholder="override"
                    inputMode="numeric"
                    value={overrides[team.teamId] ?? ''}
                    disabled={busy}
                    onChange={(e) =>
                      setOverrides((prev) => ({ ...prev, [team.teamId]: e.target.value }))
                    }
                    className="font-mono tabular-nums"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy || !(overrides[team.teamId] ?? '').trim()}
                  onClick={() => void handleOverride(team.teamId)}
                >
                  Ajuster
                </Button>
              </li>
            ))}
          </ol>
        )}

        <Button
          type="button"
          disabled={busy || ordered.length === 0}
          onClick={() => void handleSeed()}
          icon={
            seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )
          }
        >
          Générer les ratings
        </Button>
      </Card>

      {/* --- Réglages moteur --- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl tracking-tight text-white">Réglages du moteur</h2>
        {config ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {(
                [
                  ['margin', 'Marge (overround)', '0.06'],
                  ['k', 'K (volatilité)', '24'],
                  ['warmupGames', 'Warmup (BO)', '2'],
                  ['seedRatingMin', 'Seed min', '1300'],
                  ['seedRatingMax', 'Seed max', '1700'],
                  ['probClampMin', 'Clamp proba min', '0.10'],
                  ['probClampMax', 'Clamp proba max', '0.90'],
                  ['minStake', 'Mise min', '1'],
                  ['maxStake', 'Mise max (vide = ∞)', ''],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div key={key} className="flex flex-col gap-2">
                  <label className="label-mono text-foreground-dim">{label}</label>
                  <Input
                    inputMode="decimal"
                    placeholder={placeholder}
                    value={config[key]}
                    disabled={busy}
                    onChange={(e) =>
                      setConfig((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                    }
                    className="font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground-dim">
              <input
                type="checkbox"
                checked={config.allowSelfTeamBets}
                disabled={busy}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, allowSelfTeamBets: e.target.checked } : prev,
                  )
                }
              />
              Autoriser les paris sur sa propre équipe
            </label>

            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveConfig()}
              icon={
                configMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
            >
              Enregistrer les réglages
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3 label-mono text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        )}
      </Card>

      {/* --- Supervision --- */}
      <Card className="space-y-5">
        <h2 className="font-display text-xl tracking-tight text-white">Supervision des paris</h2>
        {betsQuery.isLoading ? (
          <div className="flex items-center gap-3 label-mono text-foreground-dim">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : bets.length === 0 ? (
          <p className="text-sm text-foreground-dim">Aucun pari sur cette saison.</p>
        ) : (
          <div className="overflow-x-auto border border-hairline">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline label-mono text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Membre</th>
                  <th className="px-3 py-2 text-left">Match</th>
                  <th className="px-3 py-2 text-left">Choix</th>
                  <th className="px-3 py-2 text-right">Mise @ cote</th>
                  <th className="px-3 py-2 text-right">Gain pot.</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {bets.map((bet) => (
                  <tr key={bet.id}>
                    <td className="px-3 py-2 text-foreground">
                      {bet.user.name ?? bet.user.email}
                    </td>
                    <td className="px-3 py-2 text-foreground-dim">
                      {bet.match.homeTeam.shortCode}–{bet.match.awayTeam.shortCode}
                      <span className="ml-2 label-mono text-foreground-muted">
                        {formatCompactDate(bet.match.scheduledAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground-dim">{bet.selectedTeam.shortCode}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground-dim">
                      {formatCurrency(bet.stake)} @ {bet.oddsAtBet.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                      {formatCurrency(bet.potentialPayout)}
                    </td>
                    <td className={cn('px-3 py-2 label-mono', STATUS_CLASS[bet.status])}>
                      {bet.status}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {bet.status === 'PENDING' ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleVoid(bet.match.id)}
                        >
                          Annuler match
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
