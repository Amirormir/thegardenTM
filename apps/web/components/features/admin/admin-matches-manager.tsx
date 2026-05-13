'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { ArrowRightLeft, Check, Loader2, Pencil, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { Input } from '@/components/ui/input';
import { ItemRow } from '@/components/ui/item-icon';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';
import type { AppRouter } from '@/server/routers/_app';
import type { ParsedReplay, ParsedReplayPlayer } from '@/lib/validators/replay';
import { ReplayImportButton } from './replay-import-button';

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

interface GameState {
  parsed: ParsedReplay;
  blueIsHome: boolean;
  playerOverrides: Record<string, string>;
}

function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function sortRoster(players: TeamRosterPlayer[]) {
  return [...players].sort((left, right) => {
    const leftIndex = ROLE_ORDER.indexOf(left.role);
    const rightIndex = ROLE_ORDER.indexOf(right.role);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.displayName.localeCompare(right.displayName);
  });
}

function matchPlayerByRiotName(
  riotName: string | null,
  roster: TeamRosterPlayer[],
): TeamRosterPlayer | null {
  if (!riotName) return null;
  const lower = riotName.toLowerCase();
  const [namePart, tagPart] = lower.split('#');

  if (tagPart) {
    const exact = roster.find(
      (p) =>
        p.gameName.toLowerCase() === namePart &&
        p.tagLine.toLowerCase() === tagPart,
    );
    if (exact) return exact;
  }

  return roster.find((p) => p.gameName.toLowerCase() === namePart) ?? null;
}

function detectBlueIsHome(
  parsed: ParsedReplay,
  homeRoster: TeamRosterPlayer[],
  awayRoster: TeamRosterPlayer[],
): boolean {
  const bluePlayers = parsed.players.filter((p) => p.side === 'BLUE');
  let homeBlue = 0;
  let awayBlue = 0;
  for (const player of bluePlayers) {
    if (matchPlayerByRiotName(player.riot_name, homeRoster)) homeBlue += 1;
    if (matchPlayerByRiotName(player.riot_name, awayRoster)) awayBlue += 1;
  }
  if (homeBlue === 0 && awayBlue === 0) return true;
  return homeBlue >= awayBlue;
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;
  return (
    <div
      className={cn(
        'border-l-2 border-y border-r border-hairline bg-surface px-5 py-4 label-mono',
        feedback.type === 'success'
          ? 'border-l-[color:var(--win)] text-[color:var(--win)]'
          : 'border-l-[color:var(--loss)] text-[color:var(--loss)]',
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
  const [gameStates, setGameStates] = useState<Record<number, GameState>>({});

  const createMatch = api.match.create.useMutation();
  const recordResult = api.match.recordResult.useMutation();

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
  const maxGames = recordingMatch ? FORMAT_GAME_LIMIT[recordingMatch.format] : 1;

  function resetRecording() {
    setRecordingMatchId(null);
    setGameStates({});
  }

  useEffect(() => {
    if (!recordingMatchId) {
      setGameStates({});
    }
  }, [recordingMatchId]);

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

  function applyReplayToGame(gameIndex: number, parsed: ParsedReplay) {
    const blueIsHome = detectBlueIsHome(parsed, homeRoster, awayRoster);
    setGameStates((prev) => ({
      ...prev,
      [gameIndex]: {
        parsed,
        blueIsHome,
        playerOverrides: {},
      },
    }));
    setFeedback({
      type: 'success',
      message: `Game ${gameIndex + 1} importée — stats extraites automatiquement.`,
    });
  }

  function swapSides(gameIndex: number) {
    setGameStates((prev) => {
      const current = prev[gameIndex];
      if (!current) return prev;
      return {
        ...prev,
        [gameIndex]: { ...current, blueIsHome: !current.blueIsHome },
      };
    });
  }

  function setOverride(gameIndex: number, key: string, playerId: string) {
    setGameStates((prev) => {
      const current = prev[gameIndex];
      if (!current) return prev;
      return {
        ...prev,
        [gameIndex]: {
          ...current,
          playerOverrides: { ...current.playerOverrides, [key]: playerId },
        },
      };
    });
  }

  function clearGame(gameIndex: number) {
    setGameStates((prev) => {
      const next = { ...prev };
      delete next[gameIndex];
      return next;
    });
  }

  function resolvePlayerForSlot(
    gameIndex: number,
    side: 'BLUE' | 'RED',
    slotIndex: number,
    replayPlayer: ParsedReplayPlayer,
    roster: TeamRosterPlayer[],
  ): TeamRosterPlayer | null {
    const key = `${side}-${slotIndex}`;
    const override = gameStates[gameIndex]?.playerOverrides[key];
    if (override) {
      return roster.find((p) => p.id === override) ?? null;
    }
    const matched = matchPlayerByRiotName(replayPlayer.riot_name, roster);
    if (matched) return matched;
    const sameRole = roster.filter((p) => p.role === replayPlayer.role);
    return sameRole[0] ?? null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recordingMatch) return;
    setFeedback(null);

    const gameIndices = Object.keys(gameStates)
      .map((key) => Number.parseInt(key, 10))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    if (gameIndices.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Importez au moins une replay .rofl avant de valider.',
      });
      return;
    }

    if (homeRoster.length < SLOT_COUNT || awayRoster.length < SLOT_COUNT) {
      setFeedback({
        type: 'error',
        message: 'Chaque équipe doit avoir au moins 5 joueurs actifs.',
      });
      return;
    }

    try {
      let homeScore = 0;
      let awayScore = 0;
      const games = gameIndices.map((gameIndex, sequentialIndex) => {
        const state = gameStates[gameIndex]!;
        const { parsed, blueIsHome } = state;

        const blueTeam = blueIsHome ? recordingMatch.homeTeam : recordingMatch.awayTeam;
        const redTeam = blueIsHome ? recordingMatch.awayTeam : recordingMatch.homeTeam;
        const blueRoster = blueIsHome ? homeRoster : awayRoster;
        const redRoster = blueIsHome ? awayRoster : homeRoster;

        const blueReplay = parsed.teams.find((t) => t.side === 'BLUE')!;
        const winnerTeamId =
          blueReplay.result === 'WIN' ? blueTeam.id : redTeam.id;

        if (winnerTeamId === recordingMatch.homeTeam.id) homeScore += 1;
        else awayScore += 1;

        function buildSideStats(side: 'BLUE' | 'RED') {
          const roster = side === 'BLUE' ? blueRoster : redRoster;
          const sideTeamId = side === 'BLUE' ? blueTeam.id : redTeam.id;
          const sidePlayers = parsed.players
            .filter((p) => p.side === side)
            .sort((a, b) => a.position_in_team - b.position_in_team);

          return sidePlayers.map((replayPlayer, slotIndex) => {
            const player = resolvePlayerForSlot(
              gameIndex,
              side,
              slotIndex,
              replayPlayer,
              roster,
            );
            if (!player) {
              throw new Error(
                `Joueur introuvable côté ${side} (slot ${slotIndex + 1}) pour la game ${
                  gameIndex + 1
                }.`,
              );
            }
            return {
              playerId: player.id,
              teamId: sideTeamId,
              side,
              champion: replayPlayer.champion_internal,
              kills: replayPlayer.prisma.kills,
              deaths: replayPlayer.prisma.deaths,
              assists: replayPlayer.prisma.assists,
              cs: replayPlayer.prisma.cs,
              gold: replayPlayer.prisma.gold,
              damage: replayPlayer.prisma.damage,
              visionScore: replayPlayer.prisma.visionScore,
              kda: replayPlayer.enriched.kda,
              csPerMin: replayPlayer.enriched.cs_per_min,
              goldPerMin: replayPlayer.enriched.gold_per_min,
              damagePerMin: replayPlayer.enriched.damage_per_min,
              killParticipation: replayPlayer.enriched.kill_participation,
              damageShare: replayPlayer.enriched.damage_share,
              goldShare: replayPlayer.enriched.gold_share,
              items: replayPlayer.items,
            };
          });
        }

        const playerStats = [...buildSideStats('BLUE'), ...buildSideStats('RED')];
        const seenPlayers = new Set(playerStats.map((s) => s.playerId));
        if (seenPlayers.size !== playerStats.length) {
          throw new Error(
            `Doublons de joueurs dans la game ${gameIndex + 1}. Ajustez le mapping manuel.`,
          );
        }

        return {
          gameNumber: sequentialIndex + 1,
          blueTeamId: blueTeam.id,
          redTeamId: redTeam.id,
          winnerTeamId,
          playedAt: new Date(),
          durationSeconds: parsed.game.duration_seconds,
          playerStats: playerStats.map((s) => ({
            playerId: s.playerId,
            side: s.side,
            champion: s.champion,
            kills: s.kills,
            deaths: s.deaths,
            assists: s.assists,
            cs: s.cs,
            gold: s.gold,
            damage: s.damage,
            visionScore: s.visionScore,
            kda: s.kda,
            csPerMin: s.csPerMin,
            goldPerMin: s.goldPerMin,
            damagePerMin: s.damagePerMin,
            killParticipation: s.killParticipation,
            damageShare: s.damageShare,
            goldShare: s.goldShare,
            items: s.items,
          })),
        };
      });

      const winnerTeamId =
        homeScore > awayScore
          ? recordingMatch.homeTeam.id
          : awayScore > homeScore
            ? recordingMatch.awayTeam.id
            : undefined;

      await recordResult.mutateAsync({
        matchId: recordingMatch.id,
        homeScore,
        awayScore,
        winnerTeamId,
        playedAt: new Date(),
        games,
      });

      resetRecording();
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
        message: 'Résultat enregistré — stats extraites depuis les replays.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'enregistrement a échoué.";
      setFeedback({ type: 'error', message });
    }
  }

  const importedCount = Object.keys(gameStates).length;

  return (
    <div className="flex flex-col gap-10">
      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <p className="label-mono">§ Admin · Matchs</p>
          <h2 className="mt-3 display-md text-foreground">Programmation & résultats.</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setShowCreateForm(true);
            resetRecording();
          }}
        >
          Programmer un match
        </Button>
      </div>

      {showCreateForm ? (
        <section className="border-l-2 border-l-accent border-y border-r border-hairline bg-surface px-5 py-6">
          <p className="label-mono">§ Nouveau match</p>
          <h3 className="mt-3 display-md text-foreground">Programmer.</h3>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Saison</label>
              <Select name="seasonId" required defaultValue={seasons.find((s) => s.isCurrent)?.id ?? ''}>
                <option value="" disabled>
                  Choisir
                </option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {season.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Format</label>
              <Select name="format" required defaultValue="BO3">
                <option value="BO1">BO1</option>
                <option value="BO3">BO3</option>
                <option value="BO5">BO5</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Home team</label>
              <Select name="homeTeamId" required defaultValue="">
                <option value="" disabled>
                  Choisir
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.shortCode})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Away team</label>
              <Select name="awayTeamId" required defaultValue="">
                <option value="" disabled>
                  Choisir
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.shortCode})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Date</label>
              <Input
                name="scheduledAt"
                type="datetime-local"
                required
                defaultValue={toDateTimeLocalValue(new Date())}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono">Notes</label>
              <Input name="notes" placeholder="Optionnel" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button
                type="submit"
                disabled={createMatch.isPending}
                icon={
                  createMatch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )
                }
              >
                Programmer
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <p className="label-mono">§ Calendrier</p>
        <h3 className="mt-3 display-md text-foreground">Tous les matchs.</h3>

        <div className="mt-8 flex flex-col gap-px bg-hairline">
          {matchesQuery.isLoading ? (
            <div className="flex items-center gap-3 bg-background px-5 py-6 text-sm text-foreground-dim">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : matches.length > 0 ? (
            matches.map((match) => (
              <article key={match.id} className="bg-background">
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                  <div>
                    <p className="font-display text-xl text-foreground">
                      {match.homeTeam.name}{' '}
                      <span className="text-foreground-muted">vs</span> {match.awayTeam.name}
                    </p>
                    <p className="mt-1 label-mono">
                      {match.format} · {match.season.name} · {formatDateTime(match.scheduledAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl tabular-nums text-foreground">
                      {match.homeScore} – {match.awayScore}
                    </span>
                    <Badge variant={match.isCompleted ? 'actif' : 'expiré'}>
                      {match.isCompleted ? 'Terminé' : 'Programmé'}
                    </Badge>
                    {recordingMatchId === match.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={resetRecording}
                      >
                        Annuler
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={match.isCompleted ? <Pencil className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        onClick={() => {
                          setRecordingMatchId(match.id);
                          setShowCreateForm(false);
                          setGameStates({});
                        }}
                      >
                        {match.isCompleted ? 'Modifier résultat' : 'Enregistrer résultat'}
                      </Button>
                    )}
                  </div>
                </div>

                {recordingMatchId === match.id ? (
                  <form
                    className="border-t border-hairline bg-surface px-5 py-6"
                    onSubmit={handleSubmit}
                  >
                    {homeRosterQuery.isLoading || awayRosterQuery.isLoading ? (
                      <div className="flex items-center gap-3 text-sm text-foreground-dim">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement des rosters...
                      </div>
                    ) : homeRoster.length < SLOT_COUNT || awayRoster.length < SLOT_COUNT ? (
                      <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-background px-5 py-4 label-mono text-[color:var(--loss)]">
                        Les deux équipes doivent disposer d&apos;au moins cinq joueurs actifs.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="label-mono">
                              § Replays · {importedCount}/{maxGames} importée
                              {importedCount > 1 ? 's' : ''}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground-dim">
                              Importez le .rofl de chaque game. Toutes les stats sont extraites
                              automatiquement — plus aucune saisie manuelle.
                            </p>
                          </div>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={recordResult.isPending || importedCount === 0}
                            icon={
                              recordResult.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )
                            }
                          >
                            Valider {importedCount > 0 ? `(${importedCount})` : ''}
                          </Button>
                        </div>

                        <div className="flex flex-col gap-px bg-hairline">
                          {Array.from({ length: maxGames }, (_, gameIndex) => {
                            const state = gameStates[gameIndex] ?? null;
                            return (
                              <GameImportSlot
                                key={gameIndex}
                                gameIndex={gameIndex}
                                state={state}
                                match={match}
                                homeRoster={homeRoster}
                                awayRoster={awayRoster}
                                onImported={applyReplayToGame}
                                onError={(message) =>
                                  setFeedback({ type: 'error', message })
                                }
                                onSwap={() => swapSides(gameIndex)}
                                onOverride={(key, playerId) =>
                                  setOverride(gameIndex, key, playerId)
                                }
                                onClear={() => clearGame(gameIndex)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </form>
                ) : null}
              </article>
            ))
          ) : (
            <div className="bg-background px-5 py-6 text-sm text-foreground-dim">
              Aucun match enregistré.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface GameImportSlotProps {
  gameIndex: number;
  state: GameState | null;
  match: MatchSummary;
  homeRoster: TeamRosterPlayer[];
  awayRoster: TeamRosterPlayer[];
  onImported: (gameIndex: number, parsed: ParsedReplay) => void;
  onError: (message: string) => void;
  onSwap: () => void;
  onOverride: (key: string, playerId: string) => void;
  onClear: () => void;
}

function GameImportSlot({
  gameIndex,
  state,
  match,
  homeRoster,
  awayRoster,
  onImported,
  onError,
  onSwap,
  onOverride,
  onClear,
}: GameImportSlotProps) {
  if (!state) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background px-5 py-5">
        <div>
          <p className="label-mono">Game {gameIndex + 1}</p>
          <p className="mt-2 text-sm text-foreground-dim">
            Aucune replay importée.
          </p>
        </div>
        <ReplayImportButton
          gameIndex={gameIndex}
          onImported={onImported}
          onError={onError}
        />
      </div>
    );
  }

  const { parsed, blueIsHome } = state;
  const blueTeam = blueIsHome ? match.homeTeam : match.awayTeam;
  const redTeam = blueIsHome ? match.awayTeam : match.homeTeam;
  const blueRoster = blueIsHome ? homeRoster : awayRoster;
  const redRoster = blueIsHome ? awayRoster : homeRoster;
  const blueReplayTeam = parsed.teams.find((t) => t.side === 'BLUE')!;
  const winnerTeam = blueReplayTeam.result === 'WIN' ? blueTeam : redTeam;
  const durationMinutes = Math.floor(parsed.game.duration_seconds / 60);
  const durationSeconds = parsed.game.duration_seconds % 60;

  return (
    <div className="bg-background px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono">Game {gameIndex + 1} · importée</p>
          <p className="mt-2 font-display text-xl text-foreground">
            {blueTeam.shortCode} <span className="text-foreground-muted">vs</span>{' '}
            {redTeam.shortCode}
          </p>
          <p className="mt-1 label-mono">
            {durationMinutes}m {durationSeconds.toString().padStart(2, '0')}s · winner{' '}
            <span className="text-accent">{winnerTeam.shortCode}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<ArrowRightLeft className="h-4 w-4" />}
            onClick={onSwap}
          >
            Inverser sides
          </Button>
          <ReplayImportButton
            gameIndex={gameIndex}
            onImported={onImported}
            onError={onError}
          />
          <Button type="button" size="sm" variant="secondary" onClick={onClear}>
            Retirer
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-px bg-hairline xl:grid-cols-2">
        <ImportedSideBlock
          side="BLUE"
          team={blueTeam}
          roster={blueRoster}
          parsed={parsed}
          state={state}
          onOverride={onOverride}
        />
        <ImportedSideBlock
          side="RED"
          team={redTeam}
          roster={redRoster}
          parsed={parsed}
          state={state}
          onOverride={onOverride}
        />
      </div>
    </div>
  );
}

interface ImportedSideBlockProps {
  side: 'BLUE' | 'RED';
  team: MatchSummary['homeTeam'];
  roster: TeamRosterPlayer[];
  parsed: ParsedReplay;
  state: GameState;
  onOverride: (key: string, playerId: string) => void;
}

function ImportedSideBlock({
  side,
  team,
  roster,
  parsed,
  state,
  onOverride,
}: ImportedSideBlockProps) {
  const sidePlayers = parsed.players
    .filter((p) => p.side === side)
    .sort((a, b) => a.position_in_team - b.position_in_team);

  return (
    <div className="bg-background p-4">
      <div className="flex items-center justify-between gap-3 border-l-2 border-l-accent pl-3 py-1">
        <p className="label-mono">
          {side} side · {team.shortCode}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-px bg-hairline">
        {sidePlayers.map((player, slotIndex) => {
          const key = `${side}-${slotIndex}`;
          const overrideId = state.playerOverrides[key];
          const matched = matchPlayerByRiotName(player.riot_name, roster);
          const fallback = roster.filter((p) => p.role === player.role)[0] ?? null;
          const selectedId = overrideId ?? matched?.id ?? fallback?.id ?? '';
          const enriched = player.enriched;

          return (
            <div key={key} className="flex flex-col gap-3 bg-background p-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 sm:w-56">
                <ChampionIcon championId={player.champion_internal} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-display text-foreground">
                    {player.champion_display ?? player.champion_internal}
                  </p>
                  <p className="truncate label-mono">
                    {player.role} · {player.riot_name ?? 'inconnu'}
                  </p>
                </div>
              </div>

              <div className="sm:w-56">
                <Select
                  name={`override-${key}`}
                  value={selectedId}
                  onChange={(event) => onOverride(key, event.target.value)}
                >
                  <option value="" disabled>
                    Joueur
                  </option>
                  {roster.map((rosterPlayer) => (
                    <option key={rosterPlayer.id} value={rosterPlayer.id}>
                      {rosterPlayer.displayName} ({rosterPlayer.role})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 label-mono tabular-nums">
                  <span>
                    {player.prisma.kills}/{player.prisma.deaths}/{player.prisma.assists}
                  </span>
                  <span>CS {player.prisma.cs}</span>
                  <span>CS/m {enriched.cs_per_min.toFixed(1)}</span>
                  <span>GPM {Math.round(enriched.gold_per_min)}</span>
                  <span>DPM {Math.round(enriched.damage_per_min)}</span>
                  <span>KDA {enriched.kda.toFixed(2)}</span>
                  <span>KP {(enriched.kill_participation * 100).toFixed(0)}%</span>
                  <span>DS {(enriched.damage_share * 100).toFixed(0)}%</span>
                  <span>GS {(enriched.gold_share * 100).toFixed(0)}%</span>
                </div>
                <ItemRow items={player.items} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
