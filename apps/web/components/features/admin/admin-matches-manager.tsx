'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { ArrowRightLeft, Loader2, Pencil, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChampionSelect, type ChampionOption } from '@/components/ui/champion-select';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type MatchSummary = RouterOutputs['match']['getAll'][number];
type TeamRosterPlayer = RouterOutputs['player']['getByTeam'][number];

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const FORMAT_GAME_LIMIT: Record<MatchSummary['format'], number> = {
  BO1: 1,
  BO3: 3,
  BO5: 5,
};

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
const SLOT_COUNT = 5;

function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function parseInteger(value: string, fieldLabel: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} doit etre un entier positif ou nul.`);
  }

  return parsed;
}

function sortRoster(players: TeamRosterPlayer[]) {
  return [...players].sort((left, right) => {
    const leftIndex = ROLE_ORDER.indexOf(left.role);
    const rightIndex = ROLE_ORDER.indexOf(right.role);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

function buildSlotDefaults(players: TeamRosterPlayer[]) {
  const sorted = sortRoster(players);
  return Array.from({ length: SLOT_COUNT }, (_, index) => sorted[index] ?? null);
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

export function AdminMatchesManager() {
  const utils = api.useUtils();
  const matchesQuery = api.match.getAll.useQuery();
  const teamsQuery = api.team.getAll.useQuery();
  const seasonsQuery = api.league.getAllSeasons.useQuery();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recordingMatchId, setRecordingMatchId] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState(1);
  const [gameSides, setGameSides] = useState<Record<number, boolean>>({});
  const [champions, setChampions] = useState<ChampionOption[]>([]);

  const createMatch = api.match.create.useMutation();
  const recordResult = api.match.recordResult.useMutation();

  useEffect(() => {
    fetch('https://ddragon.leagueoflegends.com/cdn/15.6.1/data/en_US/champion.json')
      .then((res) => res.json() as Promise<{ data: Record<string, { id: string; name: string }> }>)
      .then((json) => {
        setChampions(
          Object.values(json.data)
            .map((c) => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => {});
  }, []);

  const matches = matchesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const seasons = seasonsQuery.data ?? [];
  const recordingMatch = useMemo(
    () => matches.find((match) => match.id === recordingMatchId) ?? null,
    [matches, recordingMatchId],
  );

  const homeRosterQuery = api.player.getByTeam.useQuery(
    { teamId: recordingMatch?.homeTeam.id ?? '' },
    { enabled: recordingMatch !== null },
  );
  const awayRosterQuery = api.player.getByTeam.useQuery(
    { teamId: recordingMatch?.awayTeam.id ?? '' },
    { enabled: recordingMatch !== null },
  );

  const homeRoster = recordingMatch ? sortRoster(homeRosterQuery.data ?? []) : [];
  const awayRoster = recordingMatch ? sortRoster(awayRosterQuery.data ?? []) : [];
  const homeSlots = buildSlotDefaults(homeRoster);
  const awaySlots = buildSlotDefaults(awayRoster);
  const maxGames = recordingMatch ? FORMAT_GAME_LIMIT[recordingMatch.format] : 1;

  function getGameSides(gameIndex: number) {
    if (!recordingMatch) return { blueTeam: null, redTeam: null, blueRoster: [] as TeamRosterPlayer[], redRoster: [] as TeamRosterPlayer[], blueSlots: [] as (TeamRosterPlayer | null)[], redSlots: [] as (TeamRosterPlayer | null)[] };
    const swapped = gameSides[gameIndex] ?? false;
    return {
      blueTeam: swapped ? recordingMatch.awayTeam : recordingMatch.homeTeam,
      redTeam: swapped ? recordingMatch.homeTeam : recordingMatch.awayTeam,
      blueRoster: swapped ? awayRoster : homeRoster,
      redRoster: swapped ? homeRoster : awayRoster,
      blueSlots: swapped ? awaySlots : homeSlots,
      redSlots: swapped ? homeSlots : awaySlots,
    };
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createMatch.mutateAsync({
        seasonId: formData.get('seasonId') as string,
        homeTeamId: formData.get('homeTeamId') as string,
        awayTeamId: formData.get('awayTeamId') as string,
        format: formData.get('format') as 'BO1' | 'BO3' | 'BO5',
        scheduledAt: new Date(formData.get('scheduledAt') as string),
        notes: (formData.get('notes') as string)?.trim() || undefined,
      });
      form.reset();
      setShowCreateForm(false);
      await utils.match.getAll.invalidate();
      setFeedback({ type: 'success', message: 'Le match a été programmé.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La création a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  async function handleRecordResult(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recordingMatch) return;
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const homeScore = parseInteger(getFormValue(formData, 'homeScore'), 'Le score domicile');
      const awayScore = parseInteger(getFormValue(formData, 'awayScore'), 'Le score exterieur');
      const winnerTeamId = getFormValue(formData, 'winnerTeamId');

      if (homeScore + awayScore !== gameCount) {
        throw new Error('Le total des scores doit correspondre au nombre de games enregistrees.');
      }

      if (!winnerTeamId) {
        throw new Error('Le vainqueur de la serie doit etre renseigne.');
      }

      if (homeRoster.length < SLOT_COUNT || awayRoster.length < SLOT_COUNT) {
        throw new Error(
          'Chaque equipe doit disposer d au moins cinq joueurs actifs pour saisir les stats.',
        );
      }

      const games = Array.from({ length: gameCount }, (_, gameIndex) => {
        const sides = getGameSides(gameIndex);
        const winnerTeamIdForGame = getFormValue(formData, `game-${gameIndex}-winnerTeamId`);

        if (!winnerTeamIdForGame) {
          throw new Error(`Le vainqueur de la game ${gameIndex + 1} doit etre renseigne.`);
        }

        function buildSideStats(side: 'BLUE' | 'RED') {
          return Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
            const playerId = getFormValue(
              formData,
              `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-playerId`,
            );
            const champion = getFormValue(
              formData,
              `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-champion`,
            ).trim();

            if (!playerId || !champion) {
              throw new Error(
                `Les stats ${side.toLowerCase()} side de la game ${gameIndex + 1} sont incompletes.`,
              );
            }

            return {
              playerId,
              side,
              champion,
              kills: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-kills`),
                `Les kills ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              deaths: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-deaths`),
                `Les deaths ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              assists: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-assists`),
                `Les assists ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              cs: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-cs`),
                `Le CS ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              gold: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-gold`),
                `Le gold ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              damage: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-damage`),
                `Les degats ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
              visionScore: parseInteger(
                getFormValue(formData, `game-${gameIndex}-${side.toLowerCase()}-slot-${slotIndex}-visionScore`),
                `La vision ${side.toLowerCase()} side de la game ${gameIndex + 1}`,
              ),
            };
          });
        }

        const playerStats = [...buildSideStats('BLUE'), ...buildSideStats('RED')];

        const uniquePlayerIds = new Set(playerStats.map((entry) => entry.playerId));
        if (uniquePlayerIds.size !== playerStats.length) {
          throw new Error(
            `Chaque joueur ne peut apparaitre qu une fois dans la game ${gameIndex + 1}.`,
          );
        }

        return {
          gameNumber: gameIndex + 1,
          riotMatchId: getFormValue(formData, `game-${gameIndex}-riotMatchId`) || undefined,
          blueTeamId: sides.blueTeam!.id,
          redTeamId: sides.redTeam!.id,
          winnerTeamId: winnerTeamIdForGame,
          playedAt: new Date(getFormValue(formData, `game-${gameIndex}-playedAt`)),
          durationSeconds: parseInteger(
            getFormValue(formData, `game-${gameIndex}-durationSeconds`),
            `La duree de la game ${gameIndex + 1}`,
          ),
          playerStats,
        };
      });

      await recordResult.mutateAsync({
        matchId: recordingMatch.id,
        homeScore,
        awayScore,
        winnerTeamId,
        playedAt: new Date(),
        games,
      });
      form.reset();
      setRecordingMatchId(null);
      setGameCount(1);
      setGameSides({});
      await Promise.all([
        utils.match.getAll.invalidate(),
        utils.match.getById.invalidate(),
        utils.player.getById.invalidate(),
        utils.player.getAll.invalidate(),
        utils.stats.getPlayerStats.invalidate(),
        utils.stats.getLeagueLeaders.invalidate(),
      ]);
      setFeedback({
        type: 'success',
        message: 'Le resultat et les stats par game ont ete enregistres.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'enregistrement a echoue.";
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="space-y-8">
      <FeedbackBanner feedback={feedback} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-kicker">Match management</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Matchs</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setShowCreateForm(true);
            setRecordingMatchId(null);
            setGameCount(1);
          }}
        >
          Programmer un match
        </Button>
      </div>

      {showCreateForm ? (
        <Card className="space-y-5">
          <h3 className="font-display text-2xl font-bold tracking-tight text-white">Nouveau match</h3>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Saison</label>
              <Select name="seasonId" required defaultValue={seasons.find((s) => s.isCurrent)?.id ?? ''}>
                <option value="" disabled>Choisir</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}{season.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Format</label>
              <Select name="format" required defaultValue="BO3">
                <option value="BO1">BO1</option>
                <option value="BO3">BO3</option>
                <option value="BO5">BO5</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Home team</label>
              <Select name="homeTeamId" required defaultValue="">
                <option value="" disabled>Choisir</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name} ({team.shortCode})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Away team</label>
              <Select name="awayTeamId" required defaultValue="">
                <option value="" disabled>Choisir</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name} ({team.shortCode})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Date</label>
              <Input name="scheduledAt" type="datetime-local" required defaultValue={toDateTimeLocalValue(new Date())} />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Notes</label>
              <Input name="notes" placeholder="Optionnel" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={createMatch.isPending} icon={createMatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                Programmer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="space-y-4">
        {matchesQuery.isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : matches.length > 0 ? (
          matches.map((match) => (
            <Card key={match.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-white">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {match.format} — {match.season.name} — {formatDateTime(match.scheduledAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-[18px] border border-white/[0.05] bg-white/[0.035] px-4 py-2 text-center">
                    <span className="font-display text-xl font-bold tracking-tight text-white">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </div>
                  <Badge variant={match.isCompleted ? 'actif' : 'expiré'}>
                    {match.isCompleted ? 'Terminé' : 'Programmé'}
                  </Badge>
                  {match.isCompleted ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => {
                        setRecordingMatchId(match.id);
                        setShowCreateForm(false);
                        setGameCount(1);
                        setGameSides({});
                      }}
                    >
                      Modifier résultat
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRecordingMatchId(match.id);
                        setShowCreateForm(false);
                        setGameCount(1);
                        setGameSides({});
                      }}
                    >
                      Enregistrer résultat
                    </Button>
                  )}
                </div>
              </div>

              {recordingMatchId === match.id ? (
                <form
                  className="space-y-5 rounded-3xl border border-white/[0.05] bg-white/[0.035] p-5"
                  onSubmit={handleRecordResult}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                        Score {match.homeTeam.shortCode}
                      </label>
                      <Input name="homeScore" type="number" min={0} required defaultValue="0" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                        Score {match.awayTeam.shortCode}
                      </label>
                      <Input name="awayScore" type="number" min={0} required defaultValue="0" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                        Vainqueur serie
                      </label>
                      <Select name="winnerTeamId" required defaultValue="">
                        <option value="" disabled>
                          Choisir
                        </option>
                        <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                        <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                        Games jouees
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={maxGames}
                        value={gameCount}
                        onChange={(event) => {
                          const nextValue = Number.parseInt(event.target.value, 10);
                          setGameCount(
                            Number.isFinite(nextValue)
                              ? Math.max(1, Math.min(maxGames, nextValue))
                              : 1,
                          );
                        }}
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={recordResult.isPending}
                        icon={
                          recordResult.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )
                        }
                      >
                        Valider
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRecordingMatchId(null);
                          setGameCount(1);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>

                  {homeRosterQuery.isLoading || awayRosterQuery.isLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-4 text-sm text-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des rosters pour la saisie des stats...
                    </div>
                  ) : homeRoster.length < SLOT_COUNT || awayRoster.length < SLOT_COUNT ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                      Les deux equipes doivent disposer d&apos;au moins cinq joueurs actifs pour enregistrer des stats par game.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from({ length: gameCount }, (_, gameIndex) => {
                        const sides = getGameSides(gameIndex);
                        return (
                        <Card key={gameIndex} className="space-y-5 border-white/[0.05] bg-black/20">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-kicker">Game {gameIndex + 1}</p>
                              <h4 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                                {sides.blueTeam?.shortCode} vs {sides.redTeam?.shortCode}
                              </h4>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                                Riot match ID
                              </label>
                              <Input
                                name={`game-${gameIndex}-riotMatchId`}
                                placeholder="Optionnel"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                                Played at
                              </label>
                              <Input
                                name={`game-${gameIndex}-playedAt`}
                                type="datetime-local"
                                required
                                defaultValue={toDateTimeLocalValue(new Date())}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                                Duree (sec)
                              </label>
                              <Input
                                name={`game-${gameIndex}-durationSeconds`}
                                type="number"
                                min={1}
                                required
                                defaultValue="1800"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                                Vainqueur game {gameIndex + 1}
                              </label>
                              <Select name={`game-${gameIndex}-winnerTeamId`} required defaultValue="">
                                <option value="" disabled>
                                  Choisir
                                </option>
                                <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                                <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                icon={<ArrowRightLeft className="h-4 w-4" />}
                                onClick={() =>
                                  setGameSides((prev) => ({
                                    ...prev,
                                    [gameIndex]: !(prev[gameIndex] ?? false),
                                  }))
                                }
                              >
                                Inverser sides
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-3 rounded-[24px] border border-sky-400/14 bg-sky-500/8 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-kicker">Blue side</p>
                                  <h5 className="mt-2 font-display text-xl font-bold tracking-tight text-white">
                                    {sides.blueTeam?.name}
                                  </h5>
                                </div>
                                <Badge variant="TOP">{sides.blueTeam?.shortCode}</Badge>
                              </div>

                              <div className="space-y-3">
                                {sides.blueSlots.map((defaultPlayer, slotIndex) => (
                                  <div
                                    key={`blue-${gameIndex}-${slotIndex}`}
                                    className="grid gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
                                  >
                                    <div className="space-y-3">
                                      <Select
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-playerId`}
                                        required
                                        defaultValue={defaultPlayer?.id ?? ''}
                                      >
                                        <option value="" disabled>
                                          Joueur
                                        </option>
                                        {sides.blueRoster.map((player) => (
                                          <option key={player.id} value={player.id}>
                                            {player.displayName} ({player.role})
                                          </option>
                                        ))}
                                      </Select>
                                      <ChampionSelect
                                        champions={champions}
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-champion`}
                                        required
                                        placeholder={`Champion ${slotIndex + 1}`}
                                      />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                                      <Input
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-kills`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="K"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-deaths`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="D"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-assists`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="A"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-cs`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="CS"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-blue-slot-${slotIndex}-gold`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="Gold"
                                      />
                                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                                        <Input
                                          name={`game-${gameIndex}-blue-slot-${slotIndex}-damage`}
                                          type="number"
                                          min={0}
                                          required
                                          defaultValue="0"
                                          placeholder="Damage"
                                        />
                                        <Input
                                          name={`game-${gameIndex}-blue-slot-${slotIndex}-visionScore`}
                                          type="number"
                                          min={0}
                                          required
                                          defaultValue="0"
                                          placeholder="Vision"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3 rounded-[24px] border border-rose-400/14 bg-rose-500/8 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-kicker">Red side</p>
                                  <h5 className="mt-2 font-display text-xl font-bold tracking-tight text-white">
                                    {sides.redTeam?.name}
                                  </h5>
                                </div>
                                <Badge variant="ADC">{sides.redTeam?.shortCode}</Badge>
                              </div>

                              <div className="space-y-3">
                                {sides.redSlots.map((defaultPlayer, slotIndex) => (
                                  <div
                                    key={`red-${gameIndex}-${slotIndex}`}
                                    className="grid gap-3 rounded-2xl border border-white/[0.05] bg-black/20 p-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
                                  >
                                    <div className="space-y-3">
                                      <Select
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-playerId`}
                                        required
                                        defaultValue={defaultPlayer?.id ?? ''}
                                      >
                                        <option value="" disabled>
                                          Joueur
                                        </option>
                                        {sides.redRoster.map((player) => (
                                          <option key={player.id} value={player.id}>
                                            {player.displayName} ({player.role})
                                          </option>
                                        ))}
                                      </Select>
                                      <ChampionSelect
                                        champions={champions}
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-champion`}
                                        required
                                        placeholder={`Champion ${slotIndex + 1}`}
                                      />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                                      <Input
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-kills`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="K"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-deaths`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="D"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-assists`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="A"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-cs`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="CS"
                                      />
                                      <Input
                                        name={`game-${gameIndex}-red-slot-${slotIndex}-gold`}
                                        type="number"
                                        min={0}
                                        required
                                        defaultValue="0"
                                        placeholder="Gold"
                                      />
                                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                                        <Input
                                          name={`game-${gameIndex}-red-slot-${slotIndex}-damage`}
                                          type="number"
                                          min={0}
                                          required
                                          defaultValue="0"
                                          placeholder="Damage"
                                        />
                                        <Input
                                          name={`game-${gameIndex}-red-slot-${slotIndex}-visionScore`}
                                          type="number"
                                          min={0}
                                          required
                                          defaultValue="0"
                                          placeholder="Vision"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </form>
              ) : null}
            </Card>
          ))
        ) : (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-4 text-sm text-text-secondary">
            Aucun match enregistré.
          </div>
        )}
      </div>
    </div>
  );
}
