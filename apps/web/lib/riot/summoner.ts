import { buildRiotCacheKey, fetchWithRiotCache } from './cache';
import { regionalRiotClient } from './client';
import { scheduleRiotRequest } from './rate-limiter';

export async function getAccountByRiotId(gameName: string, tagLine: string) {
  const key = buildRiotCacheKey('account', `${gameName}:${tagLine}`);
  const result = await fetchWithRiotCache({
    key,
    freshTtlSeconds: 3600,
    request: async () => {
      const response = await scheduleRiotRequest(() =>
        regionalRiotClient.get<{ puuid: string }>(
          `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        ),
      );
      return response.data.puuid;
    },
  });

  return result;
}
