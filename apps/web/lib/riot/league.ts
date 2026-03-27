import type { RiotRankedEntry } from '@nexus/types';
import { buildRiotCacheKey, fetchWithRiotCache } from './cache';
import { platformRiotClient } from './client';
import { scheduleRiotRequest } from './rate-limiter';

export async function getRankedInfo(summonerId: string) {
  const key = buildRiotCacheKey('ranked', summonerId);
  return fetchWithRiotCache({
    key,
    freshTtlSeconds: 3600,
    request: async () => {
      const response = await scheduleRiotRequest(() =>
        platformRiotClient.get<RiotRankedEntry[]>(
          `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`,
        ),
      );
      return response.data;
    },
  });
}
