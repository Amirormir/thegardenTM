import type { PrismaClient } from '@nexus/db';
import type { TeamStanding } from '@nexus/types';

export async function buildStandings(
  prisma: PrismaClient,
  options?: {
    seasonId?: string;
  },
): Promise<TeamStanding[]> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        shortCode: true,
        logoUrl: true,
      },
    }),
    prisma.match.findMany({
      where: {
        isCompleted: true,
        ...(options?.seasonId
          ? { seasonId: options.seasonId }
          : { season: { isCurrent: true } }),
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    }),
  ]);

  const table = new Map<string, TeamStanding>(
    teams.map((team) => [
      team.id,
      {
        id: team.id,
        name: team.name,
        slug: team.slug,
        shortCode: team.shortCode,
        logoUrl: team.logoUrl,
        wins: 0,
        losses: 0,
        mapWins: 0,
        mapLosses: 0,
        points: 0,
      },
    ]),
  );

  for (const match of matches) {
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);

    if (!home || !away) {
      continue;
    }

    home.mapWins += match.homeScore;
    home.mapLosses += match.awayScore;
    away.mapWins += match.awayScore;
    away.mapLosses += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.awayScore > match.homeScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    }
  }

  return [...table.values()].sort((left, right) => {
    const byPoints = right.points - left.points;
    if (byPoints !== 0) {
      return byPoints;
    }

    const leftDiff = left.mapWins - left.mapLosses;
    const rightDiff = right.mapWins - right.mapLosses;
    const byMapDiff = rightDiff - leftDiff;
    if (byMapDiff !== 0) {
      return byMapDiff;
    }

    return right.mapWins - left.mapWins;
  });
}
