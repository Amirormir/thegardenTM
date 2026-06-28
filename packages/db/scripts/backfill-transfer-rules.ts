/**
 * Backfill ponctuel pour appliquer les regles economiques de transfert aux
 * donnees existantes :
 *  1. Valeur marchande de chaque joueur forcee a la valeur de base de son cost.
 *  2. Clause liberatoire des contrats actifs/loan/en attente relevee a >= 50%
 *     de la (nouvelle) valeur marchande.
 *
 * Lancer un dry-run d'abord :  DRY_RUN=1 tsx scripts/backfill-transfer-rules.ts
 * Puis l'execution reelle :              tsx scripts/backfill-transfer-rules.ts
 *
 * Les constantes sont dupliquees depuis apps/web/lib/utils/transfer-rules.ts
 * (single source applicative) car ce package ne depend pas de l'app.
 */
import { ContractStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const COST_BASE_VALUE: Record<number, number> = {
  1: 10_000_000,
  2: 20_000_000,
  3: 30_000_000,
  4: 40_000_000,
  5: 55_000_000,
};
const MIN_TRANSFER_VALUE_RATIO = 0.5;

function getCostBaseValue(cost: number): number {
  return COST_BASE_VALUE[cost] ?? COST_BASE_VALUE[1]!;
}

function getTransferFloor(marketValue: number): number {
  const value = Number.isFinite(marketValue) ? marketValue : 0;
  return Math.ceil(Math.max(0, value) * MIN_TRANSFER_VALUE_RATIO);
}

const CLAUSE_FLOOR_STATUSES: ContractStatus[] = [
  ContractStatus.ACTIVE,
  ContractStatus.LOAN,
  ContractStatus.PENDING_APPROVAL,
];

async function main() {
  console.log(`\n=== Backfill regles de transfert ${DRY_RUN ? '(DRY RUN)' : '(EXECUTION REELLE)'} ===\n`);

  // 1) Aligner la valeur marchande sur la valeur de base du cost.
  const players = await prisma.player.findMany({
    select: { id: true, gameName: true, tagLine: true, cost: true, marketValue: true },
  });

  let valueChanges = 0;
  for (const player of players) {
    const base = getCostBaseValue(player.cost);
    if (player.marketValue === base) {
      continue;
    }

    valueChanges += 1;
    console.log(
      `  valeur  ${player.gameName}#${player.tagLine} (cost ${player.cost}) : ${player.marketValue} -> ${base}`,
    );

    if (!DRY_RUN) {
      await prisma.$transaction([
        prisma.marketValueHistory.create({
          data: {
            playerId: player.id,
            previousValue: player.marketValue,
            newValue: base,
            reason: 'Backfill: alignement sur la valeur de base du cost',
          },
        }),
        prisma.player.update({
          where: { id: player.id },
          data: { marketValue: base },
        }),
      ]);
    }
  }

  // 2) Relever les clauses liberatoires sous le plancher de 50%.
  const refreshed = await prisma.player.findMany({
    select: {
      id: true,
      gameName: true,
      tagLine: true,
      marketValue: true,
      contracts: {
        where: { status: { in: CLAUSE_FLOOR_STATUSES } },
        select: { id: true, releaseClause: true, status: true },
      },
    },
  });

  let clauseChanges = 0;
  for (const player of refreshed) {
    const floor = getTransferFloor(player.marketValue);
    for (const contract of player.contracts) {
      if (contract.releaseClause >= floor) {
        continue;
      }

      clauseChanges += 1;
      console.log(
        `  clause  ${player.gameName}#${player.tagLine} [${contract.status}] : ${contract.releaseClause} -> ${floor}`,
      );

      if (!DRY_RUN) {
        await prisma.contract.update({
          where: { id: contract.id },
          data: { releaseClause: floor },
        });
      }
    }
  }

  console.log(`\nJoueurs : ${valueChanges}/${players.length} valeur(s) alignee(s).`);
  console.log(`Contrats : ${clauseChanges} clause(s) relevee(s).`);
  console.log(DRY_RUN ? '\n(DRY RUN — aucune ecriture effectuee)\n' : '\nTermine.\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
