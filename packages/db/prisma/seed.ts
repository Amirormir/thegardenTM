import bcrypt from 'bcryptjs';
import {
  ContractStatus,
  MatchFormat,
  MatchResult,
  PlayerRole,
  UserRole,
  prisma,
} from '../index';

interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SeedTeam {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  budget: number;
  captainId: string;
}

interface SeedPlayer {
  id: string;
  teamId: string | null;
  firstName: string;
  lastName: string;
  slug: string;
  gameName: string;
  tagLine: string;
  puuid: string;
  summonerId: string;
  role: PlayerRole;
  age: number;
  nationality: string;
  marketValue: number;
  salary: number;
}

interface SeedGame {
  id: string;
  matchId: string;
  gameNumber: number;
  riotMatchId: string;
  blueTeamId: string;
  redTeamId: string;
  winnerTeamId: string;
  playedAt: Date;
  durationSeconds: number;
}

interface SeedMatch {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId?: string;
  format: MatchFormat;
  scheduledAt: Date;
  playedAt?: Date;
  isCompleted: boolean;
  homeScore: number;
  awayScore: number;
  notes?: string;
  games: SeedGame[];
}

const users: SeedUser[] = [
  { id: 'user-admin', name: 'Nexus Commissioner', email: 'admin@nexusleague.dev', role: UserRole.ADMIN },
  { id: 'user-standard', name: 'Nexus Member', email: 'user@nexusleague.dev', role: UserRole.USER },
  { id: 'user-captain-1', name: 'Luca Rossi', email: 'captain.aw@nexusleague.dev', role: UserRole.TEAM_CAPTAIN },
  { id: 'user-captain-2', name: 'Ethan Mercier', email: 'captain.cn@nexusleague.dev', role: UserRole.TEAM_CAPTAIN },
  { id: 'user-captain-3', name: 'Leo Renaud', email: 'captain.ge@nexusleague.dev', role: UserRole.TEAM_CAPTAIN },
  { id: 'user-captain-4', name: 'Mathis Leroy', email: 'captain.vs@nexusleague.dev', role: UserRole.TEAM_CAPTAIN },
];

const teams: SeedTeam[] = [
  { id: 'team-1', name: 'Astral Wolves', slug: 'astral-wolves', shortCode: 'AW', budget: 1200000, captainId: 'user-captain-1' },
  { id: 'team-2', name: 'Crimson Nova', slug: 'crimson-nova', shortCode: 'CN', budget: 1150000, captainId: 'user-captain-2' },
  { id: 'team-3', name: 'Golden Echo', slug: 'golden-echo', shortCode: 'GE', budget: 1100000, captainId: 'user-captain-3' },
  { id: 'team-4', name: 'Void Sentinels', slug: 'void-sentinels', shortCode: 'VS', budget: 1250000, captainId: 'user-captain-4' },
  { id: 'team-test', name: 'Admin Test Squad', slug: 'admin-test-squad', shortCode: 'ADM', budget: 1350000, captainId: 'user-admin' },
];

const players: SeedPlayer[] = [
  { id: 'player-1', teamId: 'team-1', firstName: 'Luca', lastName: 'Rossi', slug: 'wolfedge', gameName: 'WolfEdge', tagLine: 'EUW', puuid: 'puuid-player-1', summonerId: 'summoner-player-1', role: PlayerRole.TOP, age: 23, nationality: 'Italy', marketValue: 920000, salary: 210000 },
  { id: 'player-2', teamId: 'team-1', firstName: 'Nassim', lastName: 'Benali', slug: 'orbit', gameName: 'Orbit', tagLine: 'EUW', puuid: 'puuid-player-2', summonerId: 'summoner-player-2', role: PlayerRole.JUNGLE, age: 21, nationality: 'France', marketValue: 880000, salary: 195000 },
  { id: 'player-3', teamId: 'team-1', firstName: 'Victor', lastName: 'Martins', slug: 'midline', gameName: 'Midline', tagLine: 'EUW', puuid: 'puuid-player-3', summonerId: 'summoner-player-3', role: PlayerRole.MID, age: 22, nationality: 'Portugal', marketValue: 940000, salary: 225000 },
  { id: 'player-4', teamId: 'team-1', firstName: 'Theo', lastName: 'Lambert', slug: 'aero', gameName: 'Aero', tagLine: 'EUW', puuid: 'puuid-player-4', summonerId: 'summoner-player-4', role: PlayerRole.ADC, age: 20, nationality: 'France', marketValue: 960000, salary: 230000 },
  { id: 'player-5', teamId: 'team-1', firstName: 'Samir', lastName: 'Khan', slug: 'bulwark', gameName: 'Bulwark', tagLine: 'EUW', puuid: 'puuid-player-5', summonerId: 'summoner-player-5', role: PlayerRole.SUPPORT, age: 24, nationality: 'Belgium', marketValue: 720000, salary: 170000 },
  { id: 'player-6', teamId: 'team-2', firstName: 'Ethan', lastName: 'Mercier', slug: 'riftcore', gameName: 'Riftcore', tagLine: 'EUW', puuid: 'puuid-player-6', summonerId: 'summoner-player-6', role: PlayerRole.TOP, age: 24, nationality: 'France', marketValue: 780000, salary: 180000 },
  { id: 'player-7', teamId: 'team-2', firstName: 'Ilyes', lastName: 'Chevalier', slug: 'pulse', gameName: 'Pulse', tagLine: 'EUW', puuid: 'puuid-player-7', summonerId: 'summoner-player-7', role: PlayerRole.JUNGLE, age: 22, nationality: 'France', marketValue: 845000, salary: 192000 },
  { id: 'player-8', teamId: 'team-2', firstName: 'Noah', lastName: 'Petit', slug: 'scarletfox', gameName: 'ScarletFox', tagLine: 'EUW', puuid: 'puuid-player-8', summonerId: 'summoner-player-8', role: PlayerRole.MID, age: 20, nationality: 'France', marketValue: 905000, salary: 220000 },
  { id: 'player-9', teamId: 'team-2', firstName: 'Adam', lastName: 'Durand', slug: 'hexa', gameName: 'Hexa', tagLine: 'EUW', puuid: 'puuid-player-9', summonerId: 'summoner-player-9', role: PlayerRole.ADC, age: 22, nationality: 'France', marketValue: 890000, salary: 208000 },
  { id: 'player-10', teamId: 'team-2', firstName: 'Yanis', lastName: 'Masson', slug: 'parry', gameName: 'Parry', tagLine: 'EUW', puuid: 'puuid-player-10', summonerId: 'summoner-player-10', role: PlayerRole.SUPPORT, age: 23, nationality: 'France', marketValue: 670000, salary: 162000 },
  { id: 'player-11', teamId: 'team-3', firstName: 'Leo', lastName: 'Renaud', slug: 'goldenpalm', gameName: 'GoldenPalm', tagLine: 'EUW', puuid: 'puuid-player-11', summonerId: 'summoner-player-11', role: PlayerRole.TOP, age: 25, nationality: 'France', marketValue: 730000, salary: 176000 },
  { id: 'player-12', teamId: 'team-3', firstName: 'Mehdi', lastName: 'Fernandes', slug: 'catalyst', gameName: 'Catalyst', tagLine: 'EUW', puuid: 'puuid-player-12', summonerId: 'summoner-player-12', role: PlayerRole.JUNGLE, age: 21, nationality: 'Portugal', marketValue: 760000, salary: 184000 },
  { id: 'player-13', teamId: 'team-3', firstName: 'Rayan', lastName: 'Lopez', slug: 'echolux', gameName: 'EchoLux', tagLine: 'EUW', puuid: 'puuid-player-13', summonerId: 'summoner-player-13', role: PlayerRole.MID, age: 20, nationality: 'Spain', marketValue: 830000, salary: 200000 },
  { id: 'player-14', teamId: 'team-3', firstName: 'Jules', lastName: 'Pereira', slug: 'sunfire', gameName: 'Sunfire', tagLine: 'EUW', puuid: 'puuid-player-14', summonerId: 'summoner-player-14', role: PlayerRole.ADC, age: 21, nationality: 'Portugal', marketValue: 815000, salary: 196000 },
  { id: 'player-15', teamId: 'team-3', firstName: 'Ibrahim', lastName: 'Costa', slug: 'halo', gameName: 'Halo', tagLine: 'EUW', puuid: 'puuid-player-15', summonerId: 'summoner-player-15', role: PlayerRole.SUPPORT, age: 24, nationality: 'Spain', marketValue: 640000, salary: 154000 },
  { id: 'player-16', teamId: 'team-4', firstName: 'Mathis', lastName: 'Leroy', slug: 'nightfall', gameName: 'Nightfall', tagLine: 'EUW', puuid: 'puuid-player-16', summonerId: 'summoner-player-16', role: PlayerRole.TOP, age: 24, nationality: 'France', marketValue: 860000, salary: 200000 },
  { id: 'player-17', teamId: 'team-4', firstName: 'Nolan', lastName: 'Garcia', slug: 'vanta', gameName: 'Vanta', tagLine: 'EUW', puuid: 'puuid-player-17', summonerId: 'summoner-player-17', role: PlayerRole.JUNGLE, age: 22, nationality: 'Spain', marketValue: 900000, salary: 214000 },
  { id: 'player-18', teamId: 'team-4', firstName: 'Ayman', lastName: 'Robert', slug: 'zeropulse', gameName: 'ZeroPulse', tagLine: 'EUW', puuid: 'puuid-player-18', summonerId: 'summoner-player-18', role: PlayerRole.MID, age: 21, nationality: 'France', marketValue: 980000, salary: 235000 },
  { id: 'player-19', teamId: 'team-4', firstName: 'Tom', lastName: 'Bernard', slug: 'abyssal', gameName: 'Abyssal', tagLine: 'EUW', puuid: 'puuid-player-19', summonerId: 'summoner-player-19', role: PlayerRole.ADC, age: 23, nationality: 'France', marketValue: 970000, salary: 232000 },
  { id: 'player-20', teamId: 'team-4', firstName: 'Bilal', lastName: 'Lemoine', slug: 'wardlock', gameName: 'Wardlock', tagLine: 'EUW', puuid: 'puuid-player-20', summonerId: 'summoner-player-20', role: PlayerRole.SUPPORT, age: 25, nationality: 'France', marketValue: 690000, salary: 166000 },
  { id: 'player-21', teamId: null, firstName: 'Nathan', lastName: 'Vidal', slug: 'stonewall', gameName: 'Stonewall', tagLine: 'EUW', puuid: 'puuid-player-21', summonerId: 'summoner-player-21', role: PlayerRole.TOP, age: 22, nationality: 'France', marketValue: 560000, salary: 0 },
  { id: 'player-22', teamId: null, firstName: 'Rami', lastName: 'Santos', slug: 'wildpath', gameName: 'WildPath', tagLine: 'EUW', puuid: 'puuid-player-22', summonerId: 'summoner-player-22', role: PlayerRole.JUNGLE, age: 21, nationality: 'Portugal', marketValue: 590000, salary: 0 },
  { id: 'player-23', teamId: null, firstName: 'Hugo', lastName: 'Morel', slug: 'glasslane', gameName: 'GlassLane', tagLine: 'EUW', puuid: 'puuid-player-23', summonerId: 'summoner-player-23', role: PlayerRole.MID, age: 20, nationality: 'France', marketValue: 610000, salary: 0 },
  { id: 'player-24', teamId: null, firstName: 'Yassine', lastName: 'Belaid', slug: 'skyrift', gameName: 'SkyRift', tagLine: 'EUW', puuid: 'puuid-player-24', summonerId: 'summoner-player-24', role: PlayerRole.ADC, age: 23, nationality: 'Belgium', marketValue: 605000, salary: 0 },
  { id: 'player-25', teamId: null, firstName: 'Eliot', lastName: 'Martin', slug: 'anchorpoint', gameName: 'AnchorPoint', tagLine: 'EUW', puuid: 'puuid-player-25', summonerId: 'summoner-player-25', role: PlayerRole.SUPPORT, age: 24, nationality: 'France', marketValue: 530000, salary: 0 },
];

const seasonId = 'season-2026-spring';

const matches: SeedMatch[] = [
  {
    id: 'match-1',
    seasonId,
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    winnerTeamId: 'team-1',
    format: MatchFormat.BO3,
    scheduledAt: new Date('2026-02-07T18:00:00.000Z'),
    playedAt: new Date('2026-02-07T21:10:00.000Z'),
    isCompleted: true,
    homeScore: 2,
    awayScore: 1,
    notes: 'Opening week thriller with a clutch game three from Aero.',
    games: [
      { id: 'game-1', matchId: 'match-1', gameNumber: 1, riotMatchId: 'EUW1_2026001', blueTeamId: 'team-1', redTeamId: 'team-2', winnerTeamId: 'team-1', playedAt: new Date('2026-02-07T18:10:00.000Z'), durationSeconds: 1980 },
      { id: 'game-2', matchId: 'match-1', gameNumber: 2, riotMatchId: 'EUW1_2026002', blueTeamId: 'team-2', redTeamId: 'team-1', winnerTeamId: 'team-2', playedAt: new Date('2026-02-07T19:00:00.000Z'), durationSeconds: 2080 },
      { id: 'game-3', matchId: 'match-1', gameNumber: 3, riotMatchId: 'EUW1_2026003', blueTeamId: 'team-1', redTeamId: 'team-2', winnerTeamId: 'team-1', playedAt: new Date('2026-02-07T19:54:00.000Z'), durationSeconds: 2240 },
    ],
  },
  {
    id: 'match-2',
    seasonId,
    homeTeamId: 'team-4',
    awayTeamId: 'team-3',
    winnerTeamId: 'team-4',
    format: MatchFormat.BO3,
    scheduledAt: new Date('2026-02-14T18:00:00.000Z'),
    playedAt: new Date('2026-02-14T20:32:00.000Z'),
    isCompleted: true,
    homeScore: 2,
    awayScore: 0,
    notes: 'Void Sentinels imposed a faster macro pace than Golden Echo could match.',
    games: [
      { id: 'game-4', matchId: 'match-2', gameNumber: 1, riotMatchId: 'EUW1_2026004', blueTeamId: 'team-4', redTeamId: 'team-3', winnerTeamId: 'team-4', playedAt: new Date('2026-02-14T18:12:00.000Z'), durationSeconds: 1910 },
      { id: 'game-5', matchId: 'match-2', gameNumber: 2, riotMatchId: 'EUW1_2026005', blueTeamId: 'team-3', redTeamId: 'team-4', winnerTeamId: 'team-4', playedAt: new Date('2026-02-14T19:06:00.000Z'), durationSeconds: 2035 },
    ],
  },
  {
    id: 'match-3',
    seasonId,
    homeTeamId: 'team-2',
    awayTeamId: 'team-3',
    winnerTeamId: 'team-2',
    format: MatchFormat.BO3,
    scheduledAt: new Date('2026-02-21T18:00:00.000Z'),
    playedAt: new Date('2026-02-21T20:27:00.000Z'),
    isCompleted: true,
    homeScore: 2,
    awayScore: 0,
    notes: 'Crimson Nova stabilised their standings with a clean 2-0.',
    games: [
      { id: 'game-6', matchId: 'match-3', gameNumber: 1, riotMatchId: 'EUW1_2026006', blueTeamId: 'team-2', redTeamId: 'team-3', winnerTeamId: 'team-2', playedAt: new Date('2026-02-21T18:11:00.000Z'), durationSeconds: 1875 },
      { id: 'game-7', matchId: 'match-3', gameNumber: 2, riotMatchId: 'EUW1_2026007', blueTeamId: 'team-3', redTeamId: 'team-2', winnerTeamId: 'team-2', playedAt: new Date('2026-02-21T19:03:00.000Z'), durationSeconds: 2010 },
    ],
  },
  {
    id: 'match-4',
    seasonId,
    homeTeamId: 'team-1',
    awayTeamId: 'team-4',
    format: MatchFormat.BO5,
    scheduledAt: new Date('2026-04-11T18:00:00.000Z'),
    isCompleted: false,
    homeScore: 0,
    awayScore: 0,
    notes: 'Headliner of week six, not yet played.',
    games: [],
  },
];

const championPools: Record<PlayerRole, string[]> = {
  TOP: ['Gnar', 'Renekton', 'Kennen'],
  JUNGLE: ['Vi', 'Viego', 'Maokai'],
  MID: ['Azir', 'Ahri', 'Orianna'],
  ADC: ['KaiSa', 'Jhin', 'Ezreal'],
  SUPPORT: ['Rell', 'Nautilus', 'Braum'],
};

const baseKillsByRole: Record<PlayerRole, number> = {
  TOP: 3,
  JUNGLE: 4,
  MID: 5,
  ADC: 6,
  SUPPORT: 1,
};

const baseDeathsByRole: Record<PlayerRole, number> = {
  TOP: 3,
  JUNGLE: 4,
  MID: 3,
  ADC: 2,
  SUPPORT: 4,
};

const baseAssistsByRole: Record<PlayerRole, number> = {
  TOP: 5,
  JUNGLE: 8,
  MID: 7,
  ADC: 6,
  SUPPORT: 14,
};

const baseCsByRole: Record<PlayerRole, number> = {
  TOP: 255,
  JUNGLE: 180,
  MID: 272,
  ADC: 288,
  SUPPORT: 42,
};

const baseVisionByRole: Record<PlayerRole, number> = {
  TOP: 18,
  JUNGLE: 33,
  MID: 21,
  ADC: 17,
  SUPPORT: 61,
};

function buildMarketValueHistory() {
  const deltas = [18000, -12000, 24000, 31000, -8000];

  return players.map((player, index) => {
    const delta = deltas[index % deltas.length] ?? 0;

    return {
      id: `mvh-${player.id}`,
      playerId: player.id,
      previousValue: player.marketValue - delta,
      newValue: player.marketValue,
      reason: delta >= 0 ? 'Strong performances in opening split weeks' : 'Manual adjustment after review',
      changedById: 'user-admin',
      changedAt: new Date(`2026-02-${String((index % 9) + 1).padStart(2, '0')}T12:00:00.000Z`),
    };
  });
}

function buildContracts() {
  return players
    .filter((player) => player.teamId)
    .map((player, index) => ({
      id: `contract-${player.id}`,
      playerId: player.id,
      teamId: player.teamId!,
      status: ContractStatus.ACTIVE,
      salary: player.salary,
      durationBo3: 10 + index,
      transferFee: 90000 + index * 12000,
      releaseClause: player.marketValue * 2,
      approvedAt: new Date('2026-01-15T00:00:00.000Z'),
      notes: 'Initial spring split contract',
    }));
}

function buildPlayerMatchStats() {
  const playersByTeam = new Map<string, SeedPlayer[]>();

  for (const player of players) {
    if (!player.teamId) {
      continue;
    }

    const current = playersByTeam.get(player.teamId) ?? [];
    current.push(player);
    playersByTeam.set(player.teamId, current);
  }

  return matches.flatMap((match) =>
    match.games.flatMap((game) => {
      const blueRoster = playersByTeam.get(game.blueTeamId) ?? [];
      const redRoster = playersByTeam.get(game.redTeamId) ?? [];

      const buildSideStats = (
        roster: SeedPlayer[],
        side: 'BLUE' | 'RED',
        teamId: string,
        won: boolean,
      ) =>
        roster.map((player, index) => {
          const championPool = championPools[player.role];
          const champion =
            championPool[(game.gameNumber + index) % championPool.length] ??
            championPool[0] ??
            'Unknown';
          const kills = baseKillsByRole[player.role] + (won ? 2 : 0) + ((game.gameNumber + index) % 3);
          const deaths = Math.max(
            0,
            baseDeathsByRole[player.role] + (won ? -1 : 1) + (index % 2),
          );
          const assists = baseAssistsByRole[player.role] + (won ? 3 : 0) + game.gameNumber;
          const cs = baseCsByRole[player.role] + (won ? 18 : -6) + game.gameNumber * 5 + index * 4;
          const gold = 9300 + kills * 620 + assists * 110 + (won ? 950 : 0) + index * 115;
          const damage =
            10200 + kills * 2100 + assists * 180 + (won ? 1400 : 0) + game.gameNumber * 240;
          const visionScore = baseVisionByRole[player.role] + (won ? 3 : 0) + game.gameNumber + index;

          return {
            id: `stats-${game.id}-${player.id}`,
            playerId: player.id,
            matchGameId: game.id,
            teamId,
            champion,
            kills,
            deaths,
            assists,
            cs,
            gold,
            damage,
            visionScore,
            side,
            result: won ? MatchResult.WIN : MatchResult.LOSS,
            createdAt: game.playedAt,
          };
        });

      return [
        ...buildSideStats(blueRoster, 'BLUE', game.blueTeamId, game.winnerTeamId === game.blueTeamId),
        ...buildSideStats(redRoster, 'RED', game.redTeamId, game.winnerTeamId === game.redTeamId),
      ];
    }),
  );
}

async function main() {
  const passwordHash = await bcrypt.hash('NexusLeague!2026', 12);

  await prisma.$transaction([
    prisma.playerMatchStats.deleteMany(),
    prisma.matchGame.deleteMany(),
    prisma.match.deleteMany(),
    prisma.trophy.deleteMany(),
    prisma.marketValueHistory.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.player.deleteMany(),
    prisma.team.deleteMany(),
    prisma.season.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.createMany({
    data: users.map((user) => ({
      ...user,
      passwordHash,
      emailVerified: new Date('2026-01-05T09:00:00.000Z'),
    })),
  });

  await prisma.team.createMany({
    data: teams,
  });

  await prisma.season.create({
    data: {
      id: seasonId,
      name: 'Spring 2026',
      slug: 'spring-2026',
      year: 2026,
      isCurrent: true,
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-05-30T23:59:59.000Z'),
    },
  });

  await prisma.player.createMany({
    data: players.map((player) => ({
      ...player,
      teamId: player.teamId ?? null,
      isActive: true,
    })),
  });

  await prisma.contract.createMany({
    data: buildContracts(),
  });

  await prisma.marketValueHistory.createMany({
    data: buildMarketValueHistory(),
  });

  await prisma.match.createMany({
    data: matches.map((match) => ({
      id: match.id,
      seasonId: match.seasonId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      winnerTeamId: match.winnerTeamId ?? null,
      format: match.format,
      scheduledAt: match.scheduledAt,
      playedAt: match.playedAt ?? null,
      isCompleted: match.isCompleted,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      notes: match.notes ?? null,
    })),
  });

  await prisma.matchGame.createMany({
    data: matches.flatMap((match) => match.games),
  });

  await prisma.playerMatchStats.createMany({
    data: buildPlayerMatchStats(),
  });

  await prisma.trophy.createMany({
    data: [
      {
        id: 'trophy-week-one-champion',
        name: 'Week 1 Spotlight',
        description: 'Best collective performance in the opening week.',
        seasonId,
        teamId: 'team-4',
        awardedAt: new Date('2026-02-15T20:45:00.000Z'),
      },
      {
        id: 'trophy-week-one-mvp',
        name: 'Week 1 MVP',
        description: 'Awarded to the standout individual player of week one.',
        seasonId,
        playerId: 'player-18',
        awardedAt: new Date('2026-02-15T20:50:00.000Z'),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        id: 'audit-season-create',
        userId: 'user-admin',
        action: 'CREATE',
        entity: 'Season',
        entityId: seasonId,
        details: {
          name: 'Spring 2026',
          status: 'current',
        },
      },
      {
        id: 'audit-match-results',
        userId: 'user-admin',
        action: 'RECORD_RESULT',
        entity: 'Match',
        entityId: 'match-1',
        details: {
          homeScore: 2,
          awayScore: 1,
          winnerTeamId: 'team-1',
        },
      },
      {
        id: 'audit-market-update',
        userId: 'user-admin',
        action: 'UPDATE_MARKET_VALUE',
        entity: 'Player',
        entityId: 'player-18',
        details: {
          previousValue: 956000,
          newValue: 980000,
        },
      },
    ],
  });

  console.log('Seed completed for Nexus League.');
  console.log(`Users: ${users.length}`);
  console.log(`Teams: ${teams.length}`);
  console.log(`Players: ${players.length}`);
  console.log(`Matches: ${matches.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
