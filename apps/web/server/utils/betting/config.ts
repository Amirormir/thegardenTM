import type { Prisma } from '@nexus/db';

/**
 * Config du moteur de paris, par Saison (= "Split"). Si une saison n'a pas
 * encore de ligne BettingConfig, on renvoie les valeurs par defaut.
 */
export type ResolvedBettingConfig = {
  margin: number;
  k: number;
  warmupGames: number;
  seedRatingMin: number;
  seedRatingMax: number;
  probClampMin: number;
  probClampMax: number;
  minStake: number;
  maxStake: number | null;
  allowSelfTeamBets: boolean;
};

export const DEFAULT_BETTING_CONFIG: ResolvedBettingConfig = {
  margin: 0.06,
  k: 24,
  warmupGames: 2,
  seedRatingMin: 1300,
  seedRatingMax: 1700,
  probClampMin: 0.1,
  probClampMax: 0.9,
  minStake: 1,
  maxStake: null,
  allowSelfTeamBets: true,
};

export async function resolveBettingConfig(
  client: Prisma.TransactionClient,
  seasonId: string,
): Promise<ResolvedBettingConfig> {
  const row = await client.bettingConfig.findUnique({ where: { seasonId } });

  if (!row) {
    return DEFAULT_BETTING_CONFIG;
  }

  return {
    margin: row.margin,
    k: row.k,
    warmupGames: row.warmupGames,
    seedRatingMin: row.seedRatingMin,
    seedRatingMax: row.seedRatingMax,
    probClampMin: row.probClampMin,
    probClampMax: row.probClampMax,
    minStake: row.minStake,
    maxStake: row.maxStake,
    allowSelfTeamBets: row.allowSelfTeamBets,
  };
}
