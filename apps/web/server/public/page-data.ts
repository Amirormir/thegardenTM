import { unstable_cache } from 'next/cache';
import type { TeamStanding } from '@nexus/types';
import { prisma } from '@/lib/prisma';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';
import { buildStandings } from '@/server/utils/standings';

type RecentMatchForForm = {
  homeTeam: { id: string };
  awayTeam: { id: string };
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
};

export function computeRecentForm(
  standings: TeamStanding[],
  matches: RecentMatchForForm[],
): Record<string, ('W' | 'L')[]> {
  const completed = matches.filter((match) => match.isCompleted);
  const form: Record<string, ('W' | 'L')[]> = {};

  for (const team of standings) {
    form[team.id] = completed
      .filter((match) => match.homeTeam.id === team.id || match.awayTeam.id === team.id)
      .slice(0, 5)
      .map((match) => {
        const isHome = match.homeTeam.id === team.id;
        return (isHome ? match.homeScore > match.awayScore : match.awayScore > match.homeScore)
          ? 'W'
          : 'L';
      });
  }

  return form;
}

const getCachedPublicSeasonLabel = unstable_cache(
  async () => {
    const season = await prisma.season.findFirst({
      where: { isCurrent: true },
      select: { name: true },
    });

    return season?.name ?? null;
  },
  ['public-season-label'],
  { revalidate: 300 },
);

export async function getPublicSeasonLabel() {
  return getCachedPublicSeasonLabel();
}

const getCachedHomePageSnapshot = unstable_cache(
  async () => {
    const [
      standings,
      recentMatches,
      completedMatchCount,
      season,
      topPlayersRaw,
      playerAggregate,
      featuredArticle,
    ] = await Promise.all([
      buildStandings(prisma),
      prisma.match.findMany({
        orderBy: { scheduledAt: 'desc' },
        take: 50,
        select: {
          id: true,
          format: true,
          scheduledAt: true,
          playedAt: true,
          isCompleted: true,
          homeScore: true,
          awayScore: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
        },
      }),
      prisma.match.count({ where: { isCompleted: true } }),
      prisma.season.findFirst({
        where: { isCurrent: true },
        select: { name: true },
      }),
      prisma.player.findMany({
        where: { isActive: true },
        orderBy: [{ marketValue: 'desc' }, { id: 'asc' }],
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gameName: true,
          tagLine: true,
          imageUrl: true,
          role: true,
          marketValue: true,
          team: {
            select: {
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
        },
      }),
      prisma.player.aggregate({
        where: { isActive: true },
        _count: { id: true },
        _sum: { marketValue: true },
      }),
      prisma.article.findFirst({
        where: { isFeatured: true, isPublished: true },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          publishedAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const topPlayers = topPlayersRaw.map((player) => ({
      id: player.id,
      displayName: resolveStoredPlayerDisplayName(player),
      imageUrl: player.imageUrl,
      role: player.role,
      marketValue: player.marketValue,
      teamName: player.team?.name ?? 'Free Agent',
      teamShortCode: player.team?.shortCode ?? 'FA',
      teamLogoUrl: player.team?.logoUrl ?? null,
    }));

    const completedRecent = [...recentMatches]
      .filter((match) => match.isCompleted)
      .sort(
        (left, right) =>
          new Date(right.playedAt ?? right.scheduledAt).getTime() -
          new Date(left.playedAt ?? left.scheduledAt).getTime(),
      );

    return {
      standings,
      recentResults: completedRecent.slice(0, 3),
      recentForm: computeRecentForm(standings, recentMatches),
      completedMatchCount,
      seasonName: season?.name ?? null,
      topPlayers,
      playerCount: playerAggregate._count.id,
      totalMarketValue: playerAggregate._sum.marketValue ?? 0,
      topTeam: standings[0]
        ? {
            name: standings[0].name,
            logoUrl: standings[0].logoUrl,
            shortCode: standings[0].shortCode,
            points: standings[0].points,
          }
        : null,
      featuredArticle: featuredArticle
        ? {
            slug: featuredArticle.slug,
            title: featuredArticle.title,
            excerpt: featuredArticle.excerpt,
            coverImageUrl: featuredArticle.coverImageUrl,
            authorName: featuredArticle.author.name,
            publishedAt: featuredArticle.publishedAt,
          }
        : null,
    };
  },
  ['public-home-page-snapshot'],
  { revalidate: 60 },
);

export async function getHomePageSnapshot() {
  return getCachedHomePageSnapshot();
}

const getCachedLeaguePageSnapshot = unstable_cache(
  async () => {
    const [standings, recentSource] = await Promise.all([
      buildStandings(prisma),
      prisma.match.findMany({
        orderBy: { scheduledAt: 'desc' },
        take: 50,
        select: {
          id: true,
          format: true,
          scheduledAt: true,
          playedAt: true,
          isCompleted: true,
          homeScore: true,
          awayScore: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
              logoUrl: true,
            },
          },
        },
      }),
    ]);

    const completedMatches = [...recentSource]
      .filter((match) => match.isCompleted)
      .sort(
        (left, right) =>
          new Date(right.playedAt ?? right.scheduledAt).getTime() -
          new Date(left.playedAt ?? left.scheduledAt).getTime(),
      );

    return {
      standings,
      recentMatches: completedMatches.slice(0, 3),
      recentForm: computeRecentForm(standings, recentSource),
    };
  },
  ['public-league-page-snapshot'],
  { revalidate: 60 },
);

export async function getLeaguePageSnapshot() {
  return getCachedLeaguePageSnapshot();
}

const getCachedNewsIndexSnapshot = unstable_cache(
  async () => {
    const items = await prisma.article.findMany({
      where: { isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        isFeatured: true,
        publishedAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    const featured = items.find((item) => item.isFeatured) ?? items[0] ?? null;
    const rest = featured ? items.filter((item) => item.id !== featured.id) : items;

    return {
      featured,
      rest,
    };
  },
  ['public-news-index-snapshot'],
  { revalidate: 60 },
);

export async function getNewsIndexSnapshot() {
  return getCachedNewsIndexSnapshot();
}

const getCachedNewsArticleSnapshot = unstable_cache(
  async (slug: string) =>
    prisma.article.findFirst({
      where: { slug, isPublished: true, publishedAt: { not: null } },
      select: {
        title: true,
        excerpt: true,
        body: true,
        coverImageUrl: true,
        publishedAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    }),
  ['public-news-article-snapshot'],
  { revalidate: 60 },
);

export async function getNewsArticleSnapshot(slug: string) {
  return getCachedNewsArticleSnapshot(slug);
}

const getCachedTeamPageSnapshot = unstable_cache(
  async (teamSlug: string) => {
    const [team, standings, seasons, currentSeason] = await Promise.all([
      prisma.team.findUnique({
        where: { slug: teamSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          shortCode: true,
          logoUrl: true,
          transferBudget: true,
          salaryBudgetCap: true,
          captains: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          players: {
            orderBy: { role: 'asc' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gameName: true,
              tagLine: true,
              imageUrl: true,
              role: true,
              teamRole: true,
              secondaryRoles: true,
              marketValue: true,
              salary: true,
              nationality: true,
              age: true,
              isActive: true,
            },
          },
        },
      }),
      buildStandings(prisma),
      prisma.season.findMany({
        orderBy: { year: 'desc' },
        select: {
          id: true,
          name: true,
          year: true,
          isCurrent: true,
          startDate: true,
          endDate: true,
          _count: {
            select: {
              matches: true,
            },
          },
        },
      }),
      prisma.season.findFirst({
        where: { isCurrent: true },
        select: {
          id: true,
          name: true,
          slug: true,
          year: true,
          startDate: true,
          endDate: true,
        },
      }),
    ]);

    if (!team) {
      return null;
    }

    const schedule = await prisma.match.findMany({
      where: {
        ...(currentSeason ? { seasonId: currentSeason.id } : {}),
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        format: true,
        scheduledAt: true,
        playedAt: true,
        isCompleted: true,
        homeScore: true,
        awayScore: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            shortCode: true,
          },
        },
      },
    });

    return {
      team: {
        ...team,
        players: team.players.map((player) => ({
          ...player,
          displayName: resolveStoredPlayerDisplayName(player),
        })),
      },
      standings,
      schedule,
      seasons,
      currentSeason,
    };
  },
  ['public-team-page-snapshot'],
  { revalidate: 60 },
);

export async function getTeamPageSnapshot(teamSlug: string) {
  return getCachedTeamPageSnapshot(teamSlug);
}
