/**
 * LOCAL-ONLY cleanup.
 *
 * Removes every Match (and its cascading Drafts/DraftActions) where
 * "Admin Test Squad" (team-test) is one of the two sides. Run automatically
 * before `pnpm dev` so test sessions never inherit stale draft state from
 * a previous run.
 *
 * Real seed matches (team-1..team-4) are untouched — team-test never plays
 * in those.
 */
import { prisma } from '../index';

const TEST_TEAM_ID = 'team-test';

async function main(): Promise<void> {
  const result = await prisma.match.deleteMany({
    where: {
      OR: [{ homeTeamId: TEST_TEAM_ID }, { awayTeamId: TEST_TEAM_ID }],
    },
  });

  if (result.count === 0) {
    console.log('[clean-test-drafts] nothing to clean');
  } else {
    console.log(`[clean-test-drafts] removed ${result.count} test match(es)`);
  }
}

main()
  .catch((err) => {
    console.error('[clean-test-drafts] failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
