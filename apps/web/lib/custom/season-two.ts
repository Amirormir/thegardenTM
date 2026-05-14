import type { Filter } from 'mongodb';
import { CUSTOM_MATCH_REPLAYS_COLLECTION } from './season-two-match-detail';
import { getCustomMongoDb } from './mongo';

const LEADERBOARD_MIN_GAMES = 10;
const LEADERBOARD_DROP_RD = 150;
const TEST_LEADERBOARD_FILTER: Filter<RawPlayerStats> = {
  $or: [
    { userId: { $regex: '^(test_|random_)', $options: 'i' } },
    { username: { $regex: '^(TestPlayer|RandomPlayer)', $options: 'i' } },
  ],
};

const TIERS = [
  { name: 'Seed', min: 0, max: 14 },
  { name: 'Sprout', min: 15, max: 29 },
  { name: 'Bloom', min: 30, max: 44 },
  { name: 'Thorn', min: 45, max: 59 },
  { name: 'Crown', min: 60, max: 74 },
  { name: 'Eden', min: 75, max: 89 },
  { name: 'Heaven', min: 90, max: 100 },
] as const;

type RankedTierName = (typeof TIERS)[number]['name'];
type TierName = RankedTierName | 'Placements';

interface RawPlayerStats {
  userId: string;
  username: string;
  rating: number;
  rd: number;
  volatility: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalGames: number;
  mvpCount?: number;
  aceCount?: number;
  lastUpdated?: string | Date;
}

interface RawActivePlayer {
  userId: string;
  username: string;
  selectedRole: string | null;
  assignedRole: string | null;
  selectedCost: number | null;
  tierLabel: string | null;
}

interface RawActiveCustomGame {
  status: 'awaiting_winner' | 'awaiting_performance' | 'completed';
  queueId: string | null;
  team1: { players: RawActivePlayer[]; averageCost: number };
  team2: { players: RawActivePlayer[]; averageCost: number };
  costDifference: number;
  winner?: 'team1' | 'team2' | null;
  mvpUserId?: string | null;
  aceUserId?: string | null;
  sourceMatchId?: string | null;
  startedAt?: string | Date | null;
  finalizedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

interface RawQueue {
  _id: { toString(): string };
  isActive: boolean;
  currentPhase: string;
  maxPlayers: number;
}

interface RawQueuePlayer {
  userId: string;
  username: string;
  selectedRole?: string | null;
  selectedCost?: number | null;
  assignedRole?: string | null;
}

interface RawMatchPlayer {
  userId: string;
  username: string;
  cost: number;
  role: string;
  result: 'win' | 'loss';
  performanceRole?: 'MVP' | 'ACE' | null;
}

interface RawMatch {
  matchId: string;
  winner: 'team1' | 'team2';
  mvpUserId?: string | null;
  aceUserId?: string | null;
  resolvedAt?: string | Date | null;
  createdAt?: string | Date | null;
  team1: {
    players: RawMatchPlayer[];
    averageCost: number;
  };
  team2: {
    players: RawMatchPlayer[];
    averageCost: number;
  };
}

export interface SeasonTwoLeaderboardEntry {
  rank: number;
  isRanked: boolean;
  unrankedReason: 'placements' | 'uncertainty' | null;
  userId: string;
  username: string;
  rating: number;
  rd: number;
  displayScore: number;
  tier: {
    tier: TierName;
    subDivision: string | null;
    displayScore: number | null;
    projectedTier: RankedTierName | null;
    projectedSubDivision: string | null;
    projectedDisplayScore: number | null;
    isProvisional: boolean;
    placementsRemaining: number;
  };
  wins: number;
  losses: number;
  totalGames: number;
  gamesPlayed: number;
  winRate: number;
  mvpCount: number;
  aceCount: number;
  lastUpdated: string | null;
}

export interface SeasonTwoQueuePlayer {
  userId: string;
  username: string;
  selectedRole: string | null;
  selectedCost: number | null;
  assignedRole: string | null;
  isReady: boolean;
}

export interface SeasonTwoQueueState {
  currentPhase: string;
  maxPlayers: number;
  totalPlayers: number;
  readyPlayers: number;
  players: SeasonTwoQueuePlayer[];
}

export interface SeasonTwoActiveGame {
  status: 'awaiting_winner' | 'awaiting_performance' | 'completed';
  queueId: string | null;
  team1: { players: RawActivePlayer[]; averageCost: number };
  team2: { players: RawActivePlayer[]; averageCost: number };
  costDifference: number;
  winner: 'team1' | 'team2' | null;
  mvpUserId: string | null;
  aceUserId: string | null;
  sourceMatchId: string | null;
  startedAt: string | null;
  finalizedAt: string | null;
  updatedAt: string | null;
}

export interface SeasonTwoRecentMatch {
  matchId: string;
  winner: 'team1' | 'team2';
  mvpUserId: string | null;
  aceUserId: string | null;
  resolvedAt: string | null;
  hasReplay: boolean;
  team1: { players: RawMatchPlayer[]; averageCost: number };
  team2: { players: RawMatchPlayer[]; averageCost: number };
}

export interface SeasonTwoData {
  leaderboard: SeasonTwoLeaderboardEntry[];
  rankedCount: number;
  activeGame: SeasonTwoActiveGame | null;
  queue: SeasonTwoQueueState | null;
  recentMatches: SeasonTwoRecentMatch[];
}

function getDisplayScore(player: Pick<RawPlayerStats, 'rating'>) {
  const raw = Math.round(((player.rating - 500) / 2000) * 100);
  return Math.max(0, Math.min(100, raw));
}

function getSubDivision(displayScore: number, tier: (typeof TIERS)[number]) {
  const offset = displayScore - tier.min;
  const idx = Math.min(2, Math.floor(offset / 5));
  return ['III', 'II', 'I'][idx] ?? null;
}

function resolveRankFromDisplayScore(displayScore: number) {
  const tier = TIERS.find((entry) => displayScore >= entry.min && displayScore <= entry.max) ?? TIERS[0];

  return {
    tier: tier.name,
    subDivision: getSubDivision(displayScore, tier),
    displayScore,
  };
}

function getTier(player: Pick<RawPlayerStats, 'gamesPlayed' | 'rating' | 'rd'>) {
  const projectedRank = resolveRankFromDisplayScore(getDisplayScore(player));

  if (player.gamesPlayed < LEADERBOARD_MIN_GAMES) {
    return {
      tier: 'Placements' as const,
      subDivision: null,
      displayScore: null,
      projectedTier: projectedRank.tier,
      projectedSubDivision: projectedRank.subDivision,
      projectedDisplayScore: projectedRank.displayScore,
      isProvisional: true,
      placementsRemaining: LEADERBOARD_MIN_GAMES - player.gamesPlayed,
    };
  }

  return {
    tier: projectedRank.tier,
    subDivision: projectedRank.subDivision,
    displayScore: projectedRank.displayScore,
    projectedTier: null,
    projectedSubDivision: null,
    projectedDisplayScore: null,
    isProvisional: player.rd > 120,
    placementsRemaining: 0,
  };
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function getUnrankedReason(player: Pick<RawPlayerStats, 'gamesPlayed' | 'rd'>) {
  if (player.gamesPlayed < LEADERBOARD_MIN_GAMES) {
    return 'placements' as const;
  }

  if (player.rd > LEADERBOARD_DROP_RD) {
    return 'uncertainty' as const;
  }

  return null;
}

export async function deleteSeasonTwoTestLeaderboardEntries() {
  const db = await getCustomMongoDb();
  const result = await db
    .collection<RawPlayerStats>('playerstats')
    .deleteMany(TEST_LEADERBOARD_FILTER);

  return {
    deletedCount: result.deletedCount,
  };
}

export async function getSeasonTwoData(): Promise<SeasonTwoData> {
  const db = await getCustomMongoDb();

  const [leaderboardDocs, activeGameDoc, queueDoc, recentMatchDocs] = await Promise.all([
    db
      .collection<RawPlayerStats>('playerstats')
      .find({
        totalGames: { $gt: 0 },
      })
      .sort({ rating: -1, totalGames: -1, username: 1 })
      .limit(100)
      .toArray(),
    db.collection<RawActiveCustomGame>('activecustomgames').findOne({ key: 'current' }),
    db.collection<RawQueue>('queues').findOne({ isActive: true }),
    db
      .collection<RawMatch>('matches')
      .find({})
      .sort({ resolvedAt: -1, createdAt: -1 })
      .limit(8)
      .toArray(),
  ]);

  const queuePlayers = queueDoc
    ? await db.collection<RawQueuePlayer>('players').find({ queueId: queueDoc._id }).toArray()
    : [];
  const replayMatchIds: Array<{ matchId: string }> =
    recentMatchDocs.length > 0
      ? await db
          .collection<{ matchId: string }>(CUSTOM_MATCH_REPLAYS_COLLECTION)
          .find({
            matchId: {
              $in: recentMatchDocs.map((match) => match.matchId),
            },
          })
          .project<{ matchId: string }>({ _id: 0, matchId: 1 })
          .toArray()
      : [];
  const replayMatchIdSet = new Set(replayMatchIds.map((replay) => replay.matchId));

  const sortedLeaderboardDocs = [...leaderboardDocs].sort((left, right) => {
    const leftReason = getUnrankedReason(left);
    const rightReason = getUnrankedReason(right);

    if (leftReason == null && rightReason != null) return -1;
    if (leftReason != null && rightReason == null) return 1;
    if (right.rating !== left.rating) return right.rating - left.rating;
    if (right.totalGames !== left.totalGames) return right.totalGames - left.totalGames;
    return left.username.localeCompare(right.username, 'fr');
  });

  let rankedCount = 0;

  return {
    leaderboard: sortedLeaderboardDocs.map((player) => {
      const unrankedReason = getUnrankedReason(player);
      const isRanked = unrankedReason == null;
      if (isRanked) {
        rankedCount += 1;
      }

      return {
        rank: isRanked ? rankedCount : 0,
        isRanked,
        unrankedReason,
        userId: player.userId,
        username: player.username,
        rating: Math.round(player.rating),
        rd: Math.round(player.rd),
        displayScore: getDisplayScore(player),
        tier: getTier(player),
        wins: player.wins,
        losses: player.losses,
        totalGames: player.totalGames,
        gamesPlayed: player.gamesPlayed,
        winRate: player.totalGames > 0 ? player.wins / player.totalGames : 0,
        mvpCount: player.mvpCount ?? 0,
        aceCount: player.aceCount ?? 0,
        lastUpdated: toIsoDate(player.lastUpdated),
      };
    }),
    rankedCount,
    activeGame: activeGameDoc
      ? {
          status: activeGameDoc.status,
          queueId: activeGameDoc.queueId ?? null,
          team1: activeGameDoc.team1,
          team2: activeGameDoc.team2,
          costDifference: activeGameDoc.costDifference,
          winner: activeGameDoc.winner ?? null,
          mvpUserId: activeGameDoc.mvpUserId ?? null,
          aceUserId: activeGameDoc.aceUserId ?? null,
          sourceMatchId: activeGameDoc.sourceMatchId ?? null,
          startedAt: toIsoDate(activeGameDoc.startedAt),
          finalizedAt: toIsoDate(activeGameDoc.finalizedAt),
          updatedAt: toIsoDate(activeGameDoc.updatedAt),
        }
      : null,
    queue: queueDoc
      ? {
          currentPhase: queueDoc.currentPhase,
          maxPlayers: queueDoc.maxPlayers,
          totalPlayers: queuePlayers.length,
          readyPlayers: queuePlayers.filter(
            (player) => player.selectedRole != null && player.selectedCost != null,
          ).length,
          players: queuePlayers.map((player) => ({
            userId: player.userId,
            username: player.username,
            selectedRole: player.selectedRole ?? null,
            selectedCost: player.selectedCost ?? null,
            assignedRole: player.assignedRole ?? null,
            isReady: player.selectedRole != null && player.selectedCost != null,
          })),
        }
      : null,
    recentMatches: recentMatchDocs.map((match) => ({
      matchId: match.matchId,
      winner: match.winner,
      mvpUserId: match.mvpUserId ?? null,
      aceUserId: match.aceUserId ?? null,
      resolvedAt: toIsoDate(match.resolvedAt ?? match.createdAt),
      hasReplay: replayMatchIdSet.has(match.matchId),
      team1: match.team1,
      team2: match.team2,
    })),
  };
}
