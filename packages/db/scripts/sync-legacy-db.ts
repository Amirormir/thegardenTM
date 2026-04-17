import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function columnExists(tableName: string, columnName: string) {
  const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
        AND column_name = '${columnName}'
    ) AS "exists"`,
  );

  return result[0]?.exists ?? false;
}

async function main() {
  const hasLegacyCaptainColumn = await columnExists('Team', 'captainId');
  const hasLegacyContractStartDate = await columnExists('Contract', 'startDate');
  const hasLegacyContractEndDate = await columnExists('Contract', 'endDate');

  if (!hasLegacyCaptainColumn && !hasLegacyContractStartDate && !hasLegacyContractEndDate) {
    console.log('Legacy database sync not needed.');
    return;
  }

  console.log('Legacy database sync detected. Preserving captain and contract data before Prisma push.');

  const duplicateContracts = await prisma.$queryRawUnsafe<
    Array<{ playerId: string; teamId: string; createdAt: Date; count: number }>
  >(
    `SELECT "playerId", "teamId", "createdAt", COUNT(*)::int AS count
     FROM "Contract"
     GROUP BY 1, 2, 3
     HAVING COUNT(*) > 1`,
  );

  if (duplicateContracts.length > 0) {
    throw new Error(
      'Cannot sync legacy contracts because duplicate (playerId, teamId, createdAt) rows exist.',
    );
  }

  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL'`,
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "captainOfTeamId" TEXT`,
  );

  if (hasLegacyCaptainColumn) {
    await prisma.$executeRawUnsafe(`
      UPDATE "User" AS u
      SET "captainOfTeamId" = t.id
      FROM "Team" AS t
      WHERE t."captainId" = u.id
        AND u."captainOfTeamId" IS NULL
    `);
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "durationBo3" INTEGER`,
  );

  if (hasLegacyContractStartDate) {
    await prisma.$executeRawUnsafe(`
      UPDATE "Contract"
      SET "approvedAt" = COALESCE("approvedAt", "startDate")
      WHERE "approvedAt" IS NULL
    `);
  }

  if (hasLegacyContractStartDate && hasLegacyContractEndDate) {
    await prisma.$executeRawUnsafe(`
      UPDATE "Contract"
      SET "durationBo3" = COALESCE(
        "durationBo3",
        CASE
          WHEN "startDate" IS NOT NULL AND "endDate" IS NOT NULL THEN GREATEST(
            1,
            (
              DATE_PART('year', AGE("endDate", "startDate")) * 12
              + DATE_PART('month', AGE("endDate", "startDate"))
            )::int
          )
          ELSE 10
        END
      )
      WHERE "durationBo3" IS NULL
    `);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "Contract" AS c
    SET "releaseClause" = p."marketValue" * 2
    FROM "Player" AS p
    WHERE c."playerId" = p.id
      AND c."releaseClause" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Contract"
    SET "durationBo3" = 10
    WHERE "durationBo3" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Contract"
    ALTER COLUMN "durationBo3" SET DEFAULT 10,
    ALTER COLUMN "releaseClause" SET NOT NULL,
    ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'
  `);

  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Contract_playerId_teamId_startDate_key"`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Contract_playerId_teamId_createdAt_key" ON "Contract"("playerId", "teamId", "createdAt")`,
  );

  if (hasLegacyCaptainColumn) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Team" DROP CONSTRAINT IF EXISTS "Team_captainId_fkey"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Team_captainId_idx"`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Team_captainId_key"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Team" DROP COLUMN IF EXISTS "captainId"`);
  }

  if (hasLegacyContractStartDate || hasLegacyContractEndDate) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Contract"
      DROP COLUMN IF EXISTS "startDate",
      DROP COLUMN IF EXISTS "endDate"
    `);
  }

  console.log('Legacy database sync complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
