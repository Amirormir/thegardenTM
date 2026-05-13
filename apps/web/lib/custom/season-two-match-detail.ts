import { type ParsedReplay } from '@/lib/validators/replay';
import { getCustomMongoDb } from './mongo';

export const CUSTOM_MATCH_REPLAYS_COLLECTION = 'custommatchreplays';

type TeamKey = 'team1' | 'team2';
type ReplaySide = 'BLUE' | 'RED';

interface RawMatchPlayer {
  userId: string;
  username: string;
  ratingBefore: number;
  ratingAfter: number;
  rdBefore: number;
  rdAfter: number;
  volatilityBefore: number;
  volatilityAfter: number;
  ratingDelta: number;
  displayBefore: number;
  displayAfter: number;
  displayDelta: number;
  cost: number;
  role: string;
  result: 'win' | 'loss';
  performanceRole?: 'MVP' | 'ACE' | null;
}

interface RawMatch {
  matchId: string;
  winner: TeamKey;
  mvpUserId?: string | null;
  aceUserId?: string | null;
  createdAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolvedBy: string;
  team1: {
    players: RawMatchPlayer[];
    averageRating?: number;
    averageRD?: number;
    averageCost: number;
  };
  team2: {
    players: RawMatchPlayer[];
    averageRating?: number;
    averageRD?: number;
    averageCost: number;
  };
}

type ReplayPlayer = ParsedReplay['players'][number];
type ReplayTeam = ParsedReplay['teams'][number];
type ReplayGame = ParsedReplay['game'];

interface RawCustomMatchReplayPlayer {
  userId: string;
  username: string;
  side: ReplaySide;
  teamKey: TeamKey;
  positionInTeam: number;
  role: ReplayPlayer['role'];
  riotName: string | null;
  championInternal: string;
  championDisplay: string | null;
  prisma: ReplayPlayer['prisma'];
  enriched: ReplayPlayer['enriched'];
  items: number[];
  rawDamageTaken: number;
  rawSelfMitigated: number;
}

interface RawCustomMatchReplay {
  matchId: string;
  blueTeam: TeamKey;
  redTeam: TeamKey;
  importedAt: string | Date;
  importedBy: {
    id: string;
    name: string | null;
  };
  game: ReplayGame;
  teams: ReplayTeam[];
  players: RawCustomMatchReplayPlayer[];
}

export interface SeasonTwoMatchPlayer {
  userId: string;
  username: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  displayBefore: number;
  displayAfter: number;
  displayDelta: number;
  cost: number;
  role: string;
  result: 'win' | 'loss';
  performanceRole: 'MVP' | 'ACE' | null;
}

export interface SeasonTwoMatchImportedReplayPlayer {
  userId: string;
  username: string;
  side: ReplaySide;
  teamKey: TeamKey;
  positionInTeam: number;
  role: ReplayPlayer['role'];
  riotName: string | null;
  championInternal: string;
  championDisplay: string | null;
  prisma: ReplayPlayer['prisma'];
  enriched: ReplayPlayer['enriched'];
  items: number[];
  rawDamageTaken: number;
  rawSelfMitigated: number;
}

export interface SeasonTwoMatchImportedReplay {
  blueTeam: TeamKey;
  redTeam: TeamKey;
  winnerTeam: TeamKey | null;
  importedAt: string;
  importedBy: {
    id: string;
    name: string | null;
  };
  game: ReplayGame;
  teams: ReplayTeam[];
  players: SeasonTwoMatchImportedReplayPlayer[];
}

export interface SeasonTwoMatchDetail {
  matchId: string;
  winner: TeamKey;
  mvpUserId: string | null;
  aceUserId: string | null;
  mvpUsername: string | null;
  aceUsername: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string;
  team1: {
    averageCost: number;
    averageRating: number | null;
    averageRD: number | null;
    players: SeasonTwoMatchPlayer[];
  };
  team2: {
    averageCost: number;
    averageRating: number | null;
    averageRD: number | null;
    players: SeasonTwoMatchPlayer[];
  };
  importedReplay: SeasonTwoMatchImportedReplay | null;
}

export interface SaveSeasonTwoMatchReplayInput {
  matchId: string;
  blueTeam: TeamKey;
  parsedReplay: ParsedReplay;
  playerMappings: Array<{
    side: ReplaySide;
    positionInTeam: number;
    userId: string;
  }>;
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function getOppositeTeam(team: TeamKey): TeamKey {
  return team === 'team1' ? 'team2' : 'team1';
}

function getTeamForSide(side: ReplaySide, blueTeam: TeamKey): TeamKey {
  return side === 'BLUE' ? blueTeam : getOppositeTeam(blueTeam);
}

function getWinnerTeamFromReplay(teams: ReplayTeam[], blueTeam: TeamKey): TeamKey | null {
  const blueResult = teams.find((team) => team.side === 'BLUE')?.result;
  if (!blueResult) return null;
  return blueResult === 'WIN' ? blueTeam : getOppositeTeam(blueTeam);
}

function mapMatchPlayer(player: RawMatchPlayer): SeasonTwoMatchPlayer {
  return {
    userId: player.userId,
    username: player.username,
    ratingBefore: player.ratingBefore,
    ratingAfter: player.ratingAfter,
    ratingDelta: player.ratingDelta,
    displayBefore: player.displayBefore,
    displayAfter: player.displayAfter,
    displayDelta: player.displayDelta,
    cost: player.cost,
    role: player.role,
    result: player.result,
    performanceRole: player.performanceRole ?? null,
  };
}

function mapImportedReplayPlayer(
  player: RawCustomMatchReplayPlayer,
): SeasonTwoMatchImportedReplayPlayer {
  return {
    userId: player.userId,
    username: player.username,
    side: player.side,
    teamKey: player.teamKey,
    positionInTeam: player.positionInTeam,
    role: player.role,
    riotName: player.riotName,
    championInternal: player.championInternal,
    championDisplay: player.championDisplay,
    prisma: player.prisma,
    enriched: player.enriched,
    items: player.items,
    rawDamageTaken: player.rawDamageTaken,
    rawSelfMitigated: player.rawSelfMitigated,
  };
}

export async function getSeasonTwoMatchDetail(
  matchId: string,
): Promise<SeasonTwoMatchDetail | null> {
  const db = await getCustomMongoDb();
  const [matchDoc, replayDoc] = await Promise.all([
    db.collection<RawMatch>('matches').findOne({ matchId }),
    db.collection<RawCustomMatchReplay>(CUSTOM_MATCH_REPLAYS_COLLECTION).findOne({ matchId }),
  ]);

  if (!matchDoc) {
    return null;
  }

  const allPlayers = [...matchDoc.team1.players, ...matchDoc.team2.players];
  const mvpUsername = allPlayers.find((player) => player.userId === matchDoc.mvpUserId)?.username ?? null;
  const aceUsername = allPlayers.find((player) => player.userId === matchDoc.aceUserId)?.username ?? null;

  return {
    matchId: matchDoc.matchId,
    winner: matchDoc.winner,
    mvpUserId: matchDoc.mvpUserId ?? null,
    aceUserId: matchDoc.aceUserId ?? null,
    mvpUsername,
    aceUsername,
    createdAt: toIsoDate(matchDoc.createdAt),
    resolvedAt: toIsoDate(matchDoc.resolvedAt),
    resolvedBy: matchDoc.resolvedBy,
    team1: {
      averageCost: matchDoc.team1.averageCost,
      averageRating: matchDoc.team1.averageRating ?? null,
      averageRD: matchDoc.team1.averageRD ?? null,
      players: matchDoc.team1.players.map(mapMatchPlayer),
    },
    team2: {
      averageCost: matchDoc.team2.averageCost,
      averageRating: matchDoc.team2.averageRating ?? null,
      averageRD: matchDoc.team2.averageRD ?? null,
      players: matchDoc.team2.players.map(mapMatchPlayer),
    },
    importedReplay: replayDoc
      ? {
          blueTeam: replayDoc.blueTeam,
          redTeam: replayDoc.redTeam,
          winnerTeam: getWinnerTeamFromReplay(replayDoc.teams, replayDoc.blueTeam),
          importedAt: new Date(replayDoc.importedAt).toISOString(),
          importedBy: replayDoc.importedBy,
          game: replayDoc.game,
          teams: replayDoc.teams,
          players: replayDoc.players
            .map(mapImportedReplayPlayer)
            .sort((left, right) => {
              if (left.teamKey !== right.teamKey) {
                return left.teamKey.localeCompare(right.teamKey);
              }
              if (left.side !== right.side) {
                return left.side.localeCompare(right.side);
              }
              return left.positionInTeam - right.positionInTeam;
            }),
        }
      : null,
  };
}

export async function saveSeasonTwoMatchReplay(
  input: SaveSeasonTwoMatchReplayInput,
  actor: { id: string; name: string | null },
) {
  const db = await getCustomMongoDb();
  const matchDoc = await db.collection<RawMatch>('matches').findOne({ matchId: input.matchId });

  if (!matchDoc) {
    throw new Error('Match custom introuvable.');
  }

  const teamPlayers = {
    team1: new Map(matchDoc.team1.players.map((player) => [player.userId, player])),
    team2: new Map(matchDoc.team2.players.map((player) => [player.userId, player])),
  };

  const mappingsBySlot = new Map(
    input.playerMappings.map((mapping) => [
      `${mapping.side}:${mapping.positionInTeam}`,
      mapping.userId,
    ]),
  );

  if (mappingsBySlot.size !== input.playerMappings.length) {
    throw new Error('Chaque slot du replay doit avoir un mapping unique.');
  }

  const importedPlayers: RawCustomMatchReplayPlayer[] = input.parsedReplay.players.map((player) => {
    const slotKey = `${player.side}:${player.position_in_team}`;
    const userId = mappingsBySlot.get(slotKey);

    if (!userId) {
      throw new Error(`Le slot ${slotKey} n'a pas de joueur associe.`);
    }

    const teamKey = getTeamForSide(player.side, input.blueTeam);
    const mappedPlayer = teamPlayers[teamKey].get(userId);

    if (!mappedPlayer) {
      throw new Error(`Le joueur ${userId} n'appartient pas a ${teamKey}.`);
    }

    return {
      userId,
      username: mappedPlayer.username,
      side: player.side,
      teamKey,
      positionInTeam: player.position_in_team,
      role: player.role,
      riotName: player.riot_name,
      championInternal: player.champion_internal,
      championDisplay: player.champion_display,
      prisma: player.prisma,
      enriched: player.enriched,
      items: player.items,
      rawDamageTaken: player.raw_damage_taken,
      rawSelfMitigated: player.raw_self_mitigated,
    };
  });

  if (importedPlayers.length !== 10) {
    throw new Error('Le replay doit contenir exactement 10 joueurs.');
  }

  const uniquePlayers = new Set(importedPlayers.map((player) => player.userId));
  if (uniquePlayers.size !== importedPlayers.length) {
    throw new Error('Un meme joueur ne peut pas etre mappe plusieurs fois.');
  }

  const document: RawCustomMatchReplay = {
    matchId: input.matchId,
    blueTeam: input.blueTeam,
    redTeam: getOppositeTeam(input.blueTeam),
    importedAt: new Date(),
    importedBy: actor,
    game: input.parsedReplay.game,
    teams: input.parsedReplay.teams,
    players: importedPlayers,
  };

  await db.collection<RawCustomMatchReplay>(CUSTOM_MATCH_REPLAYS_COLLECTION).updateOne(
    { matchId: input.matchId },
    { $set: document },
    { upsert: true },
  );

  return {
    matchId: input.matchId,
    importedAt: new Date(document.importedAt).toISOString(),
  };
}
