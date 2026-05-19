/**
 * LOCAL-ONLY test setup.
 *
 * Creates a BO5 Match between "Admin Test Squad" (team-test) and a random
 * opponent picked from team-1..team-4, plus 5 fearless drafts (gameNumber 1-5)
 * so the full draft loop — including cross-game fearless lock — can be
 * exercised end-to-end.
 *
 * Each run creates a fresh Match (scheduledAt = now) so it is safe to invoke
 * repeatedly without manual cleanup.
 *
 * Usage: pnpm test:draft
 */
import { MatchFormat, prisma } from '../index';

const TEST_TEAM_ID = 'team-test';
// Fixed opponent (Crimson Nova) for reproducible local tests — change here if needed.
const OPPONENT_TEAM_ID = 'team-2';
const SEASON_ID = 'season-2026-spring';
const ADMIN_USER_ID = 'user-admin';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3004';
const FALLBACK_PATCH = '15.1.1';

async function main(): Promise<void> {
  const [adminTeam, opponent, anyChampion] = await Promise.all([
    prisma.team.findUnique({ where: { id: TEST_TEAM_ID }, select: { id: true, name: true } }),
    prisma.team.findUnique({ where: { id: OPPONENT_TEAM_ID }, select: { id: true, name: true } }),
    prisma.champion.findFirst({ where: { enabled: true }, select: { patchVersion: true } }),
  ]);

  if (!adminTeam) {
    throw new Error(`Test team "${TEST_TEAM_ID}" not found — run \`pnpm db:seed\` first.`);
  }
  if (!opponent) {
    throw new Error(`Opponent "${OPPONENT_TEAM_ID}" not found — run \`pnpm db:seed\` first.`);
  }

  const patchVersion = anyChampion?.patchVersion ?? FALLBACK_PATCH;
  const scheduledAt = new Date();

  const match = await prisma.match.create({
    data: {
      seasonId: SEASON_ID,
      homeTeamId: adminTeam.id,
      awayTeamId: opponent.id,
      format: MatchFormat.BO5,
      scheduledAt,
      isCompleted: false,
      notes: `LOCAL TEST — ${adminTeam.name} vs ${opponent.name} — generated ${scheduledAt.toISOString()}`,
    },
    select: { id: true },
  });

  const drafts = await Promise.all(
    [1, 2, 3, 4, 5].map((gameNumber) => {
      const blueIsAdmin = gameNumber % 2 === 1;
      return prisma.draft.create({
        data: {
          matchId: match.id,
          seasonId: SEASON_ID,
          format: MatchFormat.BO5,
          fearless: true,
          gameNumber,
          patchVersion,
          blueTeamId: blueIsAdmin ? adminTeam.id : opponent.id,
          redTeamId: blueIsAdmin ? opponent.id : adminTeam.id,
          createdById: ADMIN_USER_ID,
        },
        select: { id: true, gameNumber: true, blueTeamId: true, redTeamId: true },
      });
    }),
  );

  drafts.sort((a, b) => a.gameNumber - b.gameNumber);

  console.log('');
  console.log(`Match ${match.id} — BO5: ${adminTeam.name} vs ${opponent.name}`);
  console.log(`Patch: ${patchVersion} | Fearless: ON`);
  console.log('');
  console.log('Drafts:');
  for (const draft of drafts) {
    const blueIsAdmin = draft.blueTeamId === adminTeam.id;
    const sideLabel = blueIsAdmin ? 'BLUE=Admin / RED=Opponent' : 'BLUE=Opponent / RED=Admin';
    console.log(`  Game ${draft.gameNumber} (${sideLabel}): ${WEB_ORIGIN}/draft/${draft.id}`);
  }
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
