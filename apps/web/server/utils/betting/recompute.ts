import type { Prisma } from '@nexus/db';
import { computeOdds } from './odds-engine';
import { resolveBettingConfig } from './config';

/**
 * (Re)calcule et persiste les cotes d'un match.
 * Ne touche JAMAIS un match verrouille (deja joue ou dont l'heure est passee) :
 * les cotes restent figees des le kickoff. Si une des deux equipes n'a pas de
 * rating sur la saison, on supprime les cotes (etat "indisponible").
 */
export async function recomputeOdds(
  tx: Prisma.TransactionClient,
  matchId: string,
): Promise<void> {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      seasonId: true,
      homeTeamId: true,
      awayTeamId: true,
      isCompleted: true,
      scheduledAt: true,
    },
  });

  if (!match) {
    return;
  }

  // Verrouille : match termine ou kickoff passe -> cotes figees, on ne touche pas.
  if (match.isCompleted || match.scheduledAt.getTime() <= Date.now()) {
    return;
  }

  const ratings = await tx.teamRating.findMany({
    where: {
      seasonId: match.seasonId,
      teamId: { in: [match.homeTeamId, match.awayTeamId] },
    },
    select: { teamId: true, rating: true },
  });

  const ratingHome = ratings.find((r) => r.teamId === match.homeTeamId)?.rating;
  const ratingAway = ratings.find((r) => r.teamId === match.awayTeamId)?.rating;

  if (ratingHome === undefined || ratingAway === undefined) {
    await tx.matchOdds.deleteMany({ where: { matchId } });
    return;
  }

  const config = await resolveBettingConfig(tx, match.seasonId);
  const computed = computeOdds({
    ratingHome,
    ratingAway,
    margin: config.margin,
    clampMin: config.probClampMin,
    clampMax: config.probClampMax,
  });

  const data = {
    probHome: computed.probHome,
    probAway: computed.probAway,
    oddsHome: computed.oddsHome,
    oddsAway: computed.oddsAway,
    margin: config.margin,
  };

  await tx.matchOdds.upsert({
    where: { matchId },
    create: { matchId, ...data },
    update: data,
  });
}

/** Recalcule les cotes de tous les matchs a venir (non verrouilles) d'une saison. */
export async function recomputeOddsForSeason(
  tx: Prisma.TransactionClient,
  seasonId: string,
): Promise<void> {
  const matches = await tx.match.findMany({
    where: { seasonId, isCompleted: false, scheduledAt: { gt: new Date() } },
    select: { id: true },
  });

  for (const match of matches) {
    await recomputeOdds(tx, match.id);
  }
}

/** Recalcule les cotes des matchs a venir impliquant l'une des equipes donnees. */
export async function recomputeOddsForTeams(
  tx: Prisma.TransactionClient,
  seasonId: string,
  teamIds: string[],
): Promise<void> {
  const matches = await tx.match.findMany({
    where: {
      seasonId,
      isCompleted: false,
      scheduledAt: { gt: new Date() },
      OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
    },
    select: { id: true },
  });

  for (const match of matches) {
    await recomputeOdds(tx, match.id);
  }
}
