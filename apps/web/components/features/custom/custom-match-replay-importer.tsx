'use client';

import { ArrowRightLeft, Loader2, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChampionIcon } from '@/components/ui/champion-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import type { SeasonTwoMatchPlayer } from '@/lib/custom/season-two-match-detail';
import type { ParsedReplay } from '@/lib/validators/replay';
import { ReplayImportButton } from '@/components/features/admin/replay-import-button';

type TeamKey = 'team1' | 'team2';
type ReplaySide = 'BLUE' | 'RED';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface CustomMatchReplayImporterProps {
  matchId: string;
  hasReplay: boolean;
  team1Players: SeasonTwoMatchPlayer[];
  team2Players: SeasonTwoMatchPlayer[];
}

interface MatchPlayerOption {
  userId: string;
  username: string;
  role: string;
  cost: number;
}

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'] as const;

function normalizeName(value: string | null | undefined) {
  return ((value ?? '').split('#')[0] ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function normalizeRole(role: string) {
  const value = role.trim().toUpperCase();
  if (value === 'JG') return 'JUNGLE';
  if (value === 'SUP') return 'SUPPORT';
  return value;
}

function sortPlayers(players: MatchPlayerOption[]) {
  return [...players].sort((left, right) => {
    const leftIndex = ROLE_ORDER.indexOf(normalizeRole(left.role) as (typeof ROLE_ORDER)[number]);
    const rightIndex = ROLE_ORDER.indexOf(normalizeRole(right.role) as (typeof ROLE_ORDER)[number]);
    const safeLeft = leftIndex === -1 ? ROLE_ORDER.length : leftIndex;
    const safeRight = rightIndex === -1 ? ROLE_ORDER.length : rightIndex;
    if (safeLeft !== safeRight) return safeLeft - safeRight;
    return left.username.localeCompare(right.username, 'fr');
  });
}

function teamForSide(side: ReplaySide, blueTeam: TeamKey): TeamKey {
  return side === 'BLUE' ? blueTeam : blueTeam === 'team1' ? 'team2' : 'team1';
}

function buildDefaultMappings(
  parsedReplay: ParsedReplay,
  blueTeam: TeamKey,
  team1Players: MatchPlayerOption[],
  team2Players: MatchPlayerOption[],
) {
  const next: Record<string, string> = {};
  const playersByTeam = {
    team1: sortPlayers(team1Players),
    team2: sortPlayers(team2Players),
  };

  for (const side of ['BLUE', 'RED'] as const) {
    const teamKey = teamForSide(side, blueTeam);
    const roster = playersByTeam[teamKey];
    const used = new Set<string>();
    const replayPlayers = parsedReplay.players
      .filter((player) => player.side === side)
      .sort((left, right) => left.position_in_team - right.position_in_team);

    for (const replayPlayer of replayPlayers) {
      const exactName = roster.find(
        (player) =>
          !used.has(player.userId) &&
          normalizeName(player.username) !== '' &&
          normalizeName(player.username) === normalizeName(replayPlayer.riot_name),
      );
      const roleMatch = roster.find(
        (player) =>
          !used.has(player.userId) &&
          normalizeRole(player.role) === replayPlayer.role,
      );
      const fallback = roster.find((player) => !used.has(player.userId));
      const selected = exactName ?? roleMatch ?? fallback ?? null;

      if (selected) {
        used.add(selected.userId);
        next[`${replayPlayer.side}:${replayPlayer.position_in_team}`] = selected.userId;
      }
    }
  }

  return next;
}

function sideWinnerLabel(parsedReplay: ParsedReplay, blueTeam: TeamKey) {
  const blueResult = parsedReplay.teams.find((team) => team.side === 'BLUE')?.result;
  if (!blueResult) return 'Inconnu';
  const winner = blueResult === 'WIN' ? blueTeam : blueTeam === 'team1' ? 'team2' : 'team1';
  return winner === 'team1' ? 'Team 1' : 'Team 2';
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;

  return (
    <div
      className={
        feedback.type === 'success'
          ? 'border border-[color:var(--win)] px-4 py-3 text-sm text-[color:var(--win)]'
          : 'border border-[color:var(--loss)] px-4 py-3 text-sm text-[color:var(--loss)]'
      }
    >
      {feedback.message}
    </div>
  );
}

export function CustomMatchReplayImporter({
  matchId,
  hasReplay,
  team1Players,
  team2Players,
}: CustomMatchReplayImporterProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [parsedReplay, setParsedReplay] = useState<ParsedReplay | null>(null);
  const [blueTeam, setBlueTeam] = useState<TeamKey>('team1');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const importMutation = api.custom.importMatchReplay.useMutation({
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: 'Replay custom importe avec succes.',
      });
      setParsedReplay(null);
      setMappings({});
      startRefresh(() => {
        router.refresh();
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || "L'import du replay a echoue.",
      });
    },
  });

  if (status === 'loading' || session?.user?.role !== 'ADMIN') {
    return null;
  }

  const teamOptions = {
    team1: team1Players.map((player) => ({
      userId: player.userId,
      username: player.username,
      role: player.role,
      cost: player.cost,
    })),
    team2: team2Players.map((player) => ({
      userId: player.userId,
      username: player.username,
      role: player.role,
      cost: player.cost,
    })),
  };

  const isBusy = importMutation.isPending || isRefreshing;
  const allMappingsReady =
    parsedReplay != null &&
    parsedReplay.players.every((player) => mappings[`${player.side}:${player.position_in_team}`]);

  function applyImportedReplay(_: number, replay: ParsedReplay) {
    setFeedback({
      type: 'success',
      message: 'Replay parse. Verifie le mapping puis sauvegarde.',
    });
    setParsedReplay(replay);
    setBlueTeam('team1');
    setMappings(buildDefaultMappings(replay, 'team1', teamOptions.team1, teamOptions.team2));
  }

  function applyError(message: string) {
    setFeedback({
      type: 'error',
      message,
    });
  }

  function updateBlueTeam(nextTeam: TeamKey) {
    if (!parsedReplay) return;
    setBlueTeam(nextTeam);
    setMappings(buildDefaultMappings(parsedReplay, nextTeam, teamOptions.team1, teamOptions.team2));
  }

  async function handleSave() {
    if (!parsedReplay) return;

    if (!allMappingsReady) {
      setFeedback({
        type: 'error',
        message: 'Tous les slots du replay doivent etre relies a un joueur de la custom.',
      });
      return;
    }

    await importMutation.mutateAsync({
      matchId,
      blueTeam,
      parsedReplay,
      playerMappings: parsedReplay.players.map((player) => ({
        side: player.side,
        positionInTeam: player.position_in_team,
        userId: mappings[`${player.side}:${player.position_in_team}`]!,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="label-mono">Import replay custom</p>
          <h2 className="mt-3 display-md text-foreground">
            {hasReplay ? 'Remplacer le replay importe.' : 'Importer le .rofl du match.'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-dim">
            Le site parse le `.rofl` via le microservice Python, puis tu verifies le mapping des
            10 joueurs avant sauvegarde.
          </p>
        </div>
        <ReplayImportButton gameIndex={0} onImported={applyImportedReplay} onError={applyError} />
      </div>

      <FeedbackBanner feedback={feedback} />

      {parsedReplay ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={blueTeam === 'team1' ? 'primary' : 'secondary'}
                onClick={() => updateBlueTeam('team1')}
              >
                BLUE = Team 1
              </Button>
              <Button
                type="button"
                size="sm"
                variant={blueTeam === 'team2' ? 'primary' : 'secondary'}
                onClick={() => updateBlueTeam('team2')}
              >
                BLUE = Team 2
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<ArrowRightLeft className="h-4 w-4" />}
                onClick={() => updateBlueTeam(blueTeam === 'team1' ? 'team2' : 'team1')}
              >
                Inverser
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={!allMappingsReady || isBusy}
              icon={isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              onClick={() => {
                void handleSave();
              }}
            >
              Sauvegarder le replay
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card elevated>
              <p className="label-mono">Winner</p>
              <p className="mt-3 text-lg text-foreground">{sideWinnerLabel(parsedReplay, blueTeam)}</p>
            </Card>
            <Card elevated>
              <p className="label-mono">Duree</p>
              <p className="mt-3 text-lg text-foreground">
                {Math.floor(parsedReplay.game.duration_seconds / 60)}m{' '}
                {(parsedReplay.game.duration_seconds % 60).toString().padStart(2, '0')}s
              </p>
            </Card>
            <Card elevated>
              <p className="label-mono">Version</p>
              <p className="mt-3 text-lg text-foreground">
                {parsedReplay.game.game_version ?? parsedReplay.game.rofl_version}
              </p>
            </Card>
            <Card elevated>
              <p className="label-mono">Mode</p>
              <p className="mt-3 text-lg text-foreground">
                {parsedReplay.game.game_mode ?? 'Classique'}
              </p>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {(['BLUE', 'RED'] as const).map((side) => {
              const teamKey = teamForSide(side, blueTeam);
              const options = teamKey === 'team1' ? teamOptions.team1 : teamOptions.team2;
              const sidePlayers = parsedReplay.players
                .filter((player) => player.side === side)
                .sort((left, right) => left.position_in_team - right.position_in_team);

              return (
                <Card key={side} elevated>
                  <p className="label-mono">
                    {side} side · {teamKey === 'team1' ? 'Team 1' : 'Team 2'}
                  </p>
                  <div className="mt-5 flex flex-col gap-3">
                    {sidePlayers.map((player) => {
                      const slotKey = `${player.side}:${player.position_in_team}`;
                      return (
                        <div
                          key={slotKey}
                          className="flex flex-col gap-3 border-t border-hairline pt-3 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-center gap-3">
                            <ChampionIcon championId={player.champion_internal} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm text-foreground">
                                {player.champion_display ?? player.champion_internal}
                              </p>
                              <p className="truncate label-mono">
                                {player.role} · {player.riot_name ?? 'Pseudo inconnu'}
                              </p>
                            </div>
                          </div>

                          <Select
                            value={mappings[slotKey] ?? ''}
                            onChange={(event) =>
                              setMappings((current) => ({
                                ...current,
                                [slotKey]: event.target.value,
                              }))
                            }
                          >
                            <option value="" disabled>
                              Associer un joueur
                            </option>
                            {options.map((option) => (
                              <option key={option.userId} value={option.userId}>
                                {option.username} · {option.role} · Cost {option.cost}
                              </option>
                            ))}
                          </Select>

                          <p className="label-mono">
                            {player.prisma.kills}/{player.prisma.deaths}/{player.prisma.assists} · CS{' '}
                            {player.prisma.cs} · Dmg {player.prisma.damage.toLocaleString('fr-FR')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
