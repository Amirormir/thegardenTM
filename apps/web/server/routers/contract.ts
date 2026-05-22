import { TRPCError } from '@trpc/server';
import { ContractStatus, TransferOfferStatus } from '@nexus/db';
import {
  contractAdminTerminateSchema,
  contractApproveSchema,
  contractCreateSchema,
  contractPlayerSchema,
  contractRejectSchema,
  contractRenewSchema,
  contractTeamSchema,
  contractTerminateSchema,
  contractUpdateSchema,
} from '@/lib/validators/contract';
import { buildAuditLogInput } from '@/server/utils/audit';
import { ensureTeamAccess } from '@/server/utils/authz';
import {
  adminProcedure,
  captainProcedure,
  createTRPCRouter,
  publicProcedure,
} from '@/server/trpc';
import { resolveStoredPlayerDisplayName } from '@/lib/utils/player-display';

const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = [
  ContractStatus.ACTIVE,
  ContractStatus.LOAN,
];

const BUDGET_RELEVANT_STATUSES: ContractStatus[] = [
  ContractStatus.ACTIVE,
  ContractStatus.LOAN,
  ContractStatus.PENDING_APPROVAL,
];

export const contractRouter = createTRPCRouter({
  getByPlayer: publicProcedure.input(contractPlayerSchema).query(({ ctx, input }) =>
    ctx.prisma.contract.findMany({
      where: { playerId: input.playerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        salary: true,
        durationBo3: true,
        bosRemaining: true,
        releaseClause: true,
        transferFee: true,
        approvedAt: true,
        notes: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            shortCode: true,
            logoUrl: true,
          },
        },
      },
    }),
  ),

  getByTeam: captainProcedure.input(contractTeamSchema).query(async ({ ctx, input }) => {
    ensureTeamAccess(ctx.session.user, input.teamId);

    const contracts = await ctx.prisma.contract.findMany({
      where: { teamId: input.teamId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        salary: true,
        durationBo3: true,
        bosRemaining: true,
        releaseClause: true,
        transferFee: true,
        approvedAt: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gameName: true,
            role: true,
          },
        },
      },
    });

    return contracts.map((contract) => ({
      ...contract,
      player: {
        ...contract.player,
        displayName: resolveStoredPlayerDisplayName(contract.player),
      },
    }));
  }),

  getPendingApprovals: adminProcedure.query(async ({ ctx }) => {
    const contracts = await ctx.prisma.contract.findMany({
      where: { status: ContractStatus.PENDING_APPROVAL },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        salary: true,
        durationBo3: true,
        releaseClause: true,
        transferFee: true,
        notes: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gameName: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            shortCode: true,
            salaryBudgetCap: true,
          },
        },
      },
    });

    return contracts.map((contract) => ({
      ...contract,
      player: {
        ...contract.player,
        displayName: resolveStoredPlayerDisplayName(contract.player),
      },
    }));
  }),

  create: captainProcedure.input(contractCreateSchema).mutation(async ({ ctx, input }) => {
    ensureTeamAccess(ctx.session.user, input.teamId);

    const contract = await ctx.prisma.$transaction(async (tx) => {
      const [team, player, budgetContracts, activePlayerContracts] = await Promise.all([
        tx.team.findUnique({
          where: { id: input.teamId },
          select: {
            id: true,
            name: true,
            salaryBudgetCap: true,
          },
        }),
        tx.player.findUnique({
          where: { id: input.playerId },
          select: {
            id: true,
            gameName: true,
            teamId: true,
          },
        }),
        tx.contract.findMany({
          where: {
            teamId: input.teamId,
            status: {
              in: BUDGET_RELEVANT_STATUSES,
            },
          },
          select: {
            id: true,
            salary: true,
          },
        }),
        tx.contract.findMany({
          where: {
            playerId: input.playerId,
            status: {
              in: [...ACTIVE_CONTRACT_STATUSES, ContractStatus.PENDING_APPROVAL],
            },
          },
          select: {
            id: true,
            teamId: true,
          },
        }),
      ]);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
      }

      if (!player) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found.' });
      }

      if (player.teamId && player.teamId !== input.teamId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only free agents or players already on your roster can be signed here.',
        });
      }

      if (activePlayerContracts.some((c) => c.teamId !== input.teamId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This player already has an active or pending contract with another team.',
        });
      }

      if (activePlayerContracts.some((c) => c.teamId === input.teamId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This player already has an active or pending contract with this team.',
        });
      }

      const currentPayroll = budgetContracts.reduce(
        (sum, c) => sum + c.salary,
        0,
      );

      if (currentPayroll + input.salary > team.salaryBudgetCap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Masse salariale depassee pour ${team.name}. Marge restante: ${team.salaryBudgetCap - currentPayroll}. Salaire demande: ${input.salary}.`,
        });
      }

      const created = await tx.contract.create({
        data: {
          playerId: input.playerId,
          teamId: input.teamId,
          salary: input.salary,
          durationBo3: input.durationBo3,
          releaseClause: input.releaseClause,
          status: ContractStatus.PENDING_APPROVAL,
          ...(input.transferFee !== undefined ? { transferFee: input.transferFee } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
        },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          status: true,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'CREATE',
          entity: 'Contract',
          entityId: created.id,
          details: {
            playerId: created.playerId,
            teamId: created.teamId,
            status: created.status,
            salary: input.salary,
            durationBo3: input.durationBo3,
          },
        }),
      });

      return created;
    });

    return contract;
  }),

  approve: adminProcedure.input(contractApproveSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.contract.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        playerId: true,
        teamId: true,
        status: true,
        salary: true,
        durationBo3: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
    }

    if (existing.status !== ContractStatus.PENDING_APPROVAL) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only pending contracts can be approved.',
      });
    }

    return ctx.prisma.$transaction(async (tx) => {
      const [team, activeTeamContracts] = await Promise.all([
        tx.team.findUnique({
          where: { id: existing.teamId },
          select: { id: true, name: true, salaryBudgetCap: true },
        }),
        tx.contract.findMany({
          where: {
            teamId: existing.teamId,
            status: { in: ACTIVE_CONTRACT_STATUSES },
          },
          select: { salary: true },
        }),
      ]);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
      }

      const currentPayroll = activeTeamContracts.reduce((sum, c) => sum + c.salary, 0);

      if (currentPayroll + existing.salary > team.salaryBudgetCap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Masse salariale depassee pour ${team.name}. Impossible d'approuver ce contrat.`,
        });
      }

      const approved = await tx.contract.update({
        where: { id: input.id },
        data: {
          status: ContractStatus.ACTIVE,
          approvedAt: new Date(),
          bosRemaining: existing.durationBo3,
        },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          status: true,
          salary: true,
          transferFee: true,
        },
      });

      // Finalize a linked transfer offer if present: terminate previous active
      // contract on the selling team, move the money, mark FINALIZED.
      const linkedOffer = await tx.transferOffer.findFirst({
        where: {
          linkedContractId: approved.id,
          status: { in: [TransferOfferStatus.CONTRACT_IN_PROGRESS, TransferOfferStatus.VALIDATED_ADMIN] },
        },
        select: {
          id: true,
          fromTeamId: true,
          toTeamId: true,
          offeredFee: true,
        },
      });

      if (linkedOffer) {
        const previousActive = await tx.contract.findFirst({
          where: {
            playerId: approved.playerId,
            teamId: linkedOffer.toTeamId,
            status: { in: ACTIVE_CONTRACT_STATUSES },
          },
          select: { id: true },
        });

        if (previousActive) {
          await tx.contract.update({
            where: { id: previousActive.id },
            data: {
              status: ContractStatus.TERMINATED,
              terminatedAt: new Date(),
              notes: `Transfert finalise vers ${team.name}.`,
            },
          });
        }

        await tx.team.update({
          where: { id: linkedOffer.fromTeamId },
          data: { transferBudget: { decrement: linkedOffer.offeredFee } },
        });
        await tx.team.update({
          where: { id: linkedOffer.toTeamId },
          data: { transferBudget: { increment: linkedOffer.offeredFee } },
        });

        await tx.transferOffer.update({
          where: { id: linkedOffer.id },
          data: {
            status: TransferOfferStatus.FINALIZED,
            finalizedAt: new Date(),
          },
        });
      }

      await tx.player.update({
        where: { id: approved.playerId },
        data: {
          teamId: approved.teamId,
          salary: approved.salary,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'APPROVE',
          entity: 'Contract',
          entityId: input.id,
          details: {
            playerId: approved.playerId,
            teamId: approved.teamId,
            ...(linkedOffer
              ? { linkedTransferOfferId: linkedOffer.id, transferFee: linkedOffer.offeredFee }
              : {}),
          },
        }),
      });

      return approved;
    });
  }),

  reject: adminProcedure.input(contractRejectSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.contract.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        playerId: true,
        teamId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
    }

    if (existing.status !== ContractStatus.PENDING_APPROVAL) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only pending contracts can be rejected.',
      });
    }

    return ctx.prisma.$transaction(async (tx) => {
      const rejected = await tx.contract.update({
        where: { id: input.id },
        data: {
          status: ContractStatus.TERMINATED,
          terminatedAt: new Date(),
          ...(input.reason ? { notes: input.reason } : {}),
        },
        select: {
          id: true,
          status: true,
        },
      });

      const linkedOffer = await tx.transferOffer.findFirst({
        where: {
          linkedContractId: input.id,
          status: { in: [TransferOfferStatus.CONTRACT_IN_PROGRESS, TransferOfferStatus.VALIDATED_ADMIN] },
        },
        select: { id: true },
      });

      if (linkedOffer) {
        await tx.transferOffer.update({
          where: { id: linkedOffer.id },
          data: {
            status: TransferOfferStatus.REJECTED,
            rejectionReason: input.reason ?? 'Contrat rejete par administration.',
          },
        });
      }

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'REJECT',
          entity: 'Contract',
          entityId: input.id,
          details: {
            previousStatus: existing.status,
            reason: input.reason ?? null,
            ...(linkedOffer ? { linkedTransferOfferId: linkedOffer.id } : {}),
          },
        }),
      });

      return rejected;
    });
  }),

  update: captainProcedure.input(contractUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const existing = await ctx.prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        playerId: true,
        teamId: true,
        status: true,
        salary: true,
        durationBo3: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
    }

    ensureTeamAccess(ctx.session.user, existing.teamId);

    return ctx.prisma.$transaction(async (tx) => {
      const nextSalary = data.salary ?? existing.salary;

      if (data.salary !== undefined && (existing.status === 'ACTIVE' || existing.status === 'LOAN')) {
        const [team, activeTeamContracts] = await Promise.all([
          tx.team.findUnique({
            where: { id: existing.teamId },
            select: { id: true, name: true, salaryBudgetCap: true },
          }),
          tx.contract.findMany({
            where: {
              teamId: existing.teamId,
              status: { in: ACTIVE_CONTRACT_STATUSES },
              NOT: { id },
            },
            select: { salary: true },
          }),
        ]);

        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
        }

        const payroll = activeTeamContracts.reduce((sum, c) => sum + c.salary, 0) + nextSalary;

        if (payroll > team.salaryBudgetCap) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Masse salariale depassee pour ${team.name}.`,
          });
        }
      }

      const updated = await tx.contract.update({
        where: { id },
        data: {
          ...(data.salary !== undefined ? { salary: data.salary } : {}),
          ...(data.durationBo3 !== undefined ? { durationBo3: data.durationBo3 } : {}),
          ...(data.releaseClause !== undefined ? { releaseClause: data.releaseClause } : {}),
          ...(data.transferFee !== undefined ? { transferFee: data.transferFee } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
        },
        select: {
          id: true,
          teamId: true,
          status: true,
          salary: true,
          durationBo3: true,
        },
      });

      if (updated.status === 'ACTIVE' || updated.status === 'LOAN') {
        await tx.player.update({
          where: { id: existing.playerId },
          data: { salary: updated.salary },
        });
      }

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'UPDATE',
          entity: 'Contract',
          entityId: id,
          details: {
            before: existing,
            after: updated,
          },
        }),
      });

      return updated;
    });
  }),

  // Renew = expire the current active contract + create a new PENDING_APPROVAL contract
  // The new terms go through the standard admin approval flow.
  renew: captainProcedure.input(contractRenewSchema).mutation(async ({ ctx, input }) => {
    const { id, ...newTerms } = input;

    const existing = await ctx.prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        playerId: true,
        teamId: true,
        status: true,
        salary: true,
      },
    });

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
    }

    ensureTeamAccess(ctx.session.user, existing.teamId);

    if (!ACTIVE_CONTRACT_STATUSES.includes(existing.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only active or loan contracts can be renewed.',
      });
    }

    return ctx.prisma.$transaction(async (tx) => {
      // Budget check: payroll without the expiring contract + new salary <= salary cap
      const [team, otherContracts] = await Promise.all([
        tx.team.findUnique({
          where: { id: existing.teamId },
          select: { id: true, name: true, salaryBudgetCap: true },
        }),
        tx.contract.findMany({
          where: {
            teamId: existing.teamId,
            status: { in: BUDGET_RELEVANT_STATUSES },
            NOT: { id },
          },
          select: { salary: true },
        }),
      ]);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
      }

      const payrollWithoutCurrent = otherContracts.reduce((sum, c) => sum + c.salary, 0);

      if (payrollWithoutCurrent + newTerms.salary > team.salaryBudgetCap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Masse salariale depassee pour ${team.name}. Marge restante (hors contrat actuel): ${team.salaryBudgetCap - payrollWithoutCurrent}. Salaire demande: ${newTerms.salary}.`,
        });
      }

      // Expire the current contract
      await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.EXPIRED,
          terminatedAt: new Date(),
        },
      });

      // Create the renewed contract — goes back through admin approval
      const renewed = await tx.contract.create({
        data: {
          playerId: existing.playerId,
          teamId: existing.teamId,
          salary: newTerms.salary,
          durationBo3: newTerms.durationBo3,
          releaseClause: newTerms.releaseClause,
          status: ContractStatus.PENDING_APPROVAL,
          ...(newTerms.transferFee !== undefined ? { transferFee: newTerms.transferFee } : {}),
          ...(newTerms.notes ? { notes: newTerms.notes } : {}),
        },
        select: { id: true, playerId: true, teamId: true, status: true },
      });

      await tx.auditLog.create({
        data: buildAuditLogInput({
          userId: ctx.session.user.id,
          action: 'RENEW',
          entity: 'Contract',
          entityId: renewed.id,
          details: {
            previousContractId: id,
            playerId: renewed.playerId,
            teamId: renewed.teamId,
            newSalary: newTerms.salary,
            newDurationBo3: newTerms.durationBo3,
            newReleaseClause: newTerms.releaseClause,
          },
        }),
      });

      return renewed;
    });
  }),

  // Admin job: process contract expirations and 30-day notices.
  // - ACTIVE contracts past expiresAt → EXPIRED, player becomes free agent.
  // - ACTIVE contracts within the notice window → notify captains once.
  processExpirations: adminProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const settings = await ctx.prisma.leagueSettings.findUnique({ where: { id: 1 } });
    const noticeDays = settings?.contractExpiryNoticeDays ?? 30;
    const noticeThreshold = new Date(now.getTime() + noticeDays * 24 * 60 * 60 * 1000);

    return ctx.prisma.$transaction(async (tx) => {
      const expiring = await tx.contract.findMany({
        where: {
          status: { in: ACTIVE_CONTRACT_STATUSES },
          expiresAt: { lte: now },
        },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          player: { select: { firstName: true, lastName: true, gameName: true } },
          team: { select: { name: true, captains: { select: { id: true } } } },
        },
      });

      for (const contract of expiring) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: ContractStatus.EXPIRED, terminatedAt: now },
        });
        await tx.player.update({
          where: { id: contract.playerId },
          data: { teamId: null, salary: 0 },
        });
        const displayName = resolveStoredPlayerDisplayName(contract.player);
        for (const cap of contract.team.captains) {
          await tx.notification.create({
            data: {
              userId: cap.id,
              type: 'CONTRACT_EXPIRED',
              title: 'Contrat expire',
              message: `Le contrat de ${displayName} est arrive a echeance. Le joueur est desormais free agent.`,
              link: '/team/contracts',
              metadata: { contractId: contract.id, playerId: contract.playerId },
            },
          });
        }
        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'EXPIRE',
            entity: 'Contract',
            entityId: contract.id,
            details: { playerId: contract.playerId, teamId: contract.teamId },
          }),
        });
      }

      const upcoming = await tx.contract.findMany({
        where: {
          status: { in: ACTIVE_CONTRACT_STATUSES },
          expiresAt: { gt: now, lte: noticeThreshold },
          expiryNotifiedAt: null,
        },
        select: {
          id: true,
          playerId: true,
          expiresAt: true,
          player: { select: { firstName: true, lastName: true, gameName: true } },
          team: { select: { name: true, captains: { select: { id: true } } } },
        },
      });

      for (const contract of upcoming) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { expiryNotifiedAt: now },
        });
        const displayName = resolveStoredPlayerDisplayName(contract.player);
        const expiryStr = contract.expiresAt?.toISOString().slice(0, 10) ?? '';
        for (const cap of contract.team.captains) {
          await tx.notification.create({
            data: {
              userId: cap.id,
              type: 'CONTRACT_EXPIRING_SOON',
              title: 'Fin de contrat imminente',
              message: `Le contrat de ${displayName} expire le ${expiryStr}. Pensez a le renouveler.`,
              link: '/team/contracts',
              metadata: { contractId: contract.id, playerId: contract.playerId },
            },
          });
        }
      }

      return {
        expired: expiring.length,
        notified: upcoming.length,
      };
    });
  }),

  adminListActive: adminProcedure.query(async ({ ctx }) => {
    const contracts = await ctx.prisma.contract.findMany({
      where: { status: { in: ACTIVE_CONTRACT_STATUSES } },
      orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        salary: true,
        durationBo3: true,
        bosRemaining: true,
        releaseClause: true,
        transferFee: true,
        approvedAt: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gameName: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            shortCode: true,
            logoUrl: true,
            transferBudget: true,
          },
        },
      },
    });

    return contracts.map((contract) => ({
      ...contract,
      player: {
        ...contract.player,
        displayName: resolveStoredPlayerDisplayName(contract.player),
      },
    }));
  }),

  adminTerminate: adminProcedure
    .input(contractAdminTerminateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contract.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          status: true,
          salary: true,
          transferFee: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
      }

      if (
        existing.status !== ContractStatus.ACTIVE &&
        existing.status !== ContractStatus.LOAN
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only active or loan contracts can be terminated by admin.',
        });
      }

      const refundAmount =
        input.refundAmount ?? existing.transferFee ?? 0;

      return ctx.prisma.$transaction(async (tx) => {
        const terminated = await tx.contract.update({
          where: { id: input.id },
          data: {
            status: ContractStatus.TERMINATED,
            terminatedAt: new Date(),
            ...(input.reason ? { notes: input.reason } : {}),
          },
          select: {
            id: true,
            teamId: true,
            status: true,
            terminatedAt: true,
          },
        });

        const fallbackContract = await tx.contract.findFirst({
          where: {
            playerId: existing.playerId,
            status: { in: ACTIVE_CONTRACT_STATUSES },
          },
          orderBy: { updatedAt: 'desc' },
          select: { teamId: true, salary: true },
        });

        await tx.player.update({
          where: { id: existing.playerId },
          data: {
            teamId: fallbackContract?.teamId ?? null,
            salary: fallbackContract?.salary ?? 0,
          },
        });

        if (refundAmount > 0) {
          await tx.team.update({
            where: { id: existing.teamId },
            data: { transferBudget: { increment: refundAmount } },
          });
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'ADMIN_TERMINATE',
            entity: 'Contract',
            entityId: input.id,
            details: {
              previousStatus: existing.status,
              newStatus: terminated.status,
              refundAmount,
              reason: input.reason ?? null,
            },
          }),
        });

        return { ...terminated, refundAmount };
      });
    }),

  terminate: captainProcedure
    .input(contractTerminateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.contract.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          playerId: true,
          teamId: true,
          status: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found.' });
      }

      ensureTeamAccess(ctx.session.user, existing.teamId);

      return ctx.prisma.$transaction(async (tx) => {
        const terminated = await tx.contract.update({
          where: { id: input.id },
          data: {
            status: 'TERMINATED',
            terminatedAt: input.terminatedAt ?? new Date(),
            ...(input.reason ? { notes: input.reason } : {}),
          },
          select: {
            id: true,
            teamId: true,
            status: true,
            terminatedAt: true,
          },
        });

        const fallbackContract = await tx.contract.findFirst({
          where: {
            playerId: existing.playerId,
            status: { in: ACTIVE_CONTRACT_STATUSES },
          },
          orderBy: { updatedAt: 'desc' },
          select: { teamId: true, salary: true },
        });

        await tx.player.update({
          where: { id: existing.playerId },
          data: {
            teamId: fallbackContract?.teamId ?? null,
            salary: fallbackContract?.salary ?? 0,
          },
        });

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'TERMINATE',
            entity: 'Contract',
            entityId: input.id,
            details: {
              previousStatus: existing.status,
              newStatus: terminated.status,
              reason: input.reason ?? null,
            },
          }),
        });

        return terminated;
      });
    }),
});
