import type { RiotMatchDetail, RiotTimeline } from '@nexus/types';
import { buildRiotCacheKey, fetchWithRiotCache } from './cache';
import { regionalRiotClient } from './client';
import { scheduleRiotRequest } from './rate-limiter';

export async function getMatchHistory(puuid: string, count = 5) {
  const key = buildRiotCacheKey('match-history', `${puuid}:${count}`);
  return fetchWithRiotCache({
    key,
    freshTtlSeconds: 900,
    request: async () => {
      const response = await scheduleRiotRequest(() =>
        regionalRiotClient.get<string[]>(
          `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
          {
            params: { count },
          },
        ),
      );
      return response.data;
    },
  });
}

export async function getMatchDetail(matchId: string) {
  const key = buildRiotCacheKey('match', matchId);
  return fetchWithRiotCache({
    key,
    freshTtlSeconds: 86400,
    request: async () => {
      const response = await scheduleRiotRequest(() =>
        regionalRiotClient.get<RiotMatchDetail>(
          `/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        ),
      );
      return response.data;
    },
  });
}

export async function getMatchTimeline(matchId: string) {
  const key = buildRiotCacheKey('timeline', matchId);
  return fetchWithRiotCache({
    key,
    freshTtlSeconds: 86400,
    request: async () => {
      const response = await scheduleRiotRequest(() =>
        regionalRiotClient.get<RiotTimeline>(
          `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
        ),
      );
      return response.data;
    },
  });
}
