import { TRPCError } from '@trpc/server';
import { ContractStatus, TransferOfferStatus } from '@nexus/db';
import {
  transferCounterProposeSchema,
  transferOfferCreateSchema,
  transferOfferIdSchema,
  transferOfferRespondSchema,
  transferOffersByTeamSchema,
} from '@/lib/validators/transfer';
import { buildAuditLogInput } from '@/server/utils/audit';
import { ensureTeamAccess } from '@/server/utils/authz';
import {
  captainProcedure,
  createTRPCRouter,
} from '@/server/trpc';
import type { Prisma, PrismaClient } from '@nexus/db';
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

async function createNotification(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      ...(data.link ? { link: data.link } : {}),
      ...(data.metadata ? { metadata: data.metadata } : {}),
    },
  });
}

export const transferRouter = createTRPCRouter({
  getByTeam: captainProcedure
    .input(transferOffersByTeamSchema)
    .query(async ({ ctx, input }) => {
      ensureTeamAccess(ctx.session.user, input.teamId);

      const direction = input.direction ?? 'incoming';
      const where =
        direction === 'incoming'
          ? { toTeamId: input.teamId }
          : { fromTeamId: input.teamId };

      const offers = await ctx.prisma.transferOffer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          offeredFee: true,
          status: true,
          message: true,
          rejectionReason: true,
          respondedAt: true,
          createdAt: true,
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gameName: true,
              role: true,
              marketValue: true,
            },
          },
          fromTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
            },
          },
          toTeam: {
            select: {
              id: true,
              name: true,
              shortCode: true,
            },
          },
        },
      });

      return offers.map((offer) => ({
        ...offer,
        player: {
          ...offer.player,
          displayName: resolveStoredPlayerDisplayName(offer.player),
        },
      }));
    }),

  create: captainProcedure
    .input(transferOfferCreateSchema)
    .mutation(async ({ ctx, input }) => {
      ensureTeamAccess(ctx.session.user, input.fromTeamId);

      return ctx.prisma.$transaction(async (tx) => {
        const [player, fromTeam, budgetContracts] = await Promise.all([
          tx.player.findUnique({
            where: { id: input.playerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gameName: true,
              teamId: true,
              contracts: {
                where: { status: { in: ACTIVE_CONTRACT_STATUSES } },
                take: 1,
                select: { id: true, teamId: true, releaseClause: true },
              },
            },
          }),
          tx.team.findUnique({
            where: { id: input.fromTeamId },
            select: { id: true, name: true, budget: true },
          }),
          tx.contract.findMany({
            where: {
              teamId: input.fromTeamId,
              status: { in: BUDGET_RELEVANT_STATUSES },
            },
            select: { salary: true },
          }),
        ]);

        if (!player) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Joueur introuvable.' });
        }

        if (!fromTeam) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipe introuvable.' });
        }

        const playerDisplayName = resolveStoredPlayerDisplayName(player);

        if (!player.teamId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce joueur est free agent. Utilisez la creation de contrat directe.',
          });
        }

        if (player.teamId === input.fromTeamId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce joueur est deja dans votre equipe.',
          });
        }

        const activeContract = player.contracts[0];
        if (!activeContract) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Ce joueur n'a pas de contrat actif.",
          });
        }

        // Check for existing pending offer
        const existingOffer = await tx.transferOffer.findFirst({
          where: {
            playerId: input.playerId,
            fromTeamId: input.fromTeamId,
            status: TransferOfferStatus.PENDING,
          },
        });

        if (existingOffer) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vous avez deja une offre en attente pour ce joueur.',
          });
        }

        // Validate budget: the buying team must be able to afford the transfer fee
        const currentPayroll = budgetContracts.reduce((sum, c) => sum + c.salary, 0);
        const budgetRemaining = fromTeam.budget - currentPayroll;

        if (input.offeredFee > budgetRemaining) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Budget insuffisant. Budget restant: ${budgetRemaining}. Offre: ${input.offeredFee}.`,
          });
        }

        // If offered fee >= release clause, auto-accept
        const autoAccepted = input.offeredFee >= activeContract.releaseClause;

        const offer = await tx.transferOffer.create({
          data: {
            playerId: input.playerId,
            fromTeamId: input.fromTeamId,
            toTeamId: player.teamId,
            offeredFee: input.offeredFee,
            status: autoAccepted
              ? TransferOfferStatus.ACCEPTED
              : TransferOfferStatus.PENDING,
            ...(input.message ? { message: input.message } : {}),
            ...(autoAccepted ? { respondedAt: new Date() } : {}),
          },
          select: {
            id: true,
            status: true,
            offeredFee: true,
            fromTeamId: true,
            toTeamId: true,
          },
        });

        // Get selling team's captains for notification
        const sellingTeam = await tx.team.findUnique({
          where: { id: player.teamId },
          select: {
            id: true,
            name: true,
            captains: { select: { id: true } },
          },
        });

        if (autoAccepted) {
          // Auto-accepted: terminate old contract, create new PENDING_APPROVAL contract
          await tx.contract.update({
            where: { id: activeContract.id },
            data: {
              status: ContractStatus.TERMINATED,
              terminatedAt: new Date(),
              notes: `Clause liberatoire declenchee par ${fromTeam.name} (${input.offeredFee}).`,
            },
          });

          await tx.contract.create({
            data: {
              playerId: input.playerId,
              teamId: input.fromTeamId,
              salary: 0, // Captain sets salary when admin approves
              durationBo3: 10, // Default, captain can update
              releaseClause: activeContract.releaseClause,
              transferFee: input.offeredFee,
              status: ContractStatus.PENDING_APPROVAL,
              notes: `Transfert via clause liberatoire depuis ${sellingTeam?.name ?? 'equipe inconnue'}.`,
            },
          });

          // Update player's team
          await tx.player.update({
            where: { id: input.playerId },
            data: { teamId: input.fromTeamId, salary: 0 },
          });

          // Notify all selling team captains
          if (sellingTeam?.captains) {
            for (const cap of sellingTeam.captains) {
              await createNotification(tx as unknown as PrismaClient, {
                userId: cap.id,
                type: 'TRANSFER_CLAUSE_TRIGGERED',
                title: 'Clause liberatoire declenchee',
                message: `${fromTeam.name} a declenche la clause liberatoire de ${playerDisplayName} (${input.offeredFee}).`,
                link: '/team',
                metadata: { offerId: offer.id, playerId: input.playerId },
              });
            }
          }

          // Notify buying team captain
          await createNotification(tx as unknown as PrismaClient, {
            userId: ctx.session.user.id,
            type: 'TRANSFER_AUTO_ACCEPTED',
            title: 'Clause declenchee — contrat en attente',
            message: `Votre offre pour ${playerDisplayName} a declenche la clause. Le contrat est en attente de validation admin.`,
            link: '/team',
            metadata: { offerId: offer.id, playerId: input.playerId },
          });
        } else {
          // Pending: notify all selling team captains
          if (sellingTeam?.captains) {
            for (const cap of sellingTeam.captains) {
              await createNotification(tx as unknown as PrismaClient, {
                userId: cap.id,
                type: 'TRANSFER_OFFER_RECEIVED',
                title: 'Nouvelle offre de transfert',
                message: `${fromTeam.name} propose ${input.offeredFee} pour ${playerDisplayName}.`,
                link: '/team',
                metadata: { offerId: offer.id, playerId: input.playerId },
              });
            }
          }
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'CREATE',
            entity: 'TransferOffer',
            entityId: offer.id,
            details: {
              playerId: input.playerId,
              fromTeamId: input.fromTeamId,
              toTeamId: player.teamId,
              offeredFee: input.offeredFee,
              autoAccepted,
            },
          }),
        });

        return offer;
      });
    }),

  accept: captainProcedure
    .input(transferOfferRespondSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const offer = await tx.transferOffer.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            playerId: true,
            fromTeamId: true,
            toTeamId: true,
            offeredFee: true,
            counterOffer: true,
            status: true,
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gameName: true,
                contracts: {
                  where: { status: { in: ACTIVE_CONTRACT_STATUSES } },
                  take: 1,
                  select: { id: true, releaseClause: true },
                },
              },
            },
            fromTeam: { select: { id: true, name: true, captains: { select: { id: true } } } },
            toTeam: { select: { id: true, name: true, captains: { select: { id: true } } } },
          },
        });

        if (!offer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable.' });
        }

        // PENDING → selling team accepts. COUNTER_PROPOSED → buying team accepts the counter.
        const playerDisplayName = resolveStoredPlayerDisplayName(offer.player);
        const isCounterAccept = offer.status === TransferOfferStatus.COUNTER_PROPOSED;
        const acceptingTeamId = isCounterAccept ? offer.fromTeamId : offer.toTeamId;
        ensureTeamAccess(ctx.session.user, acceptingTeamId);

        if (
          offer.status !== TransferOfferStatus.PENDING &&
          offer.status !== TransferOfferStatus.COUNTER_PROPOSED
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seules les offres en attente ou en contre-proposition peuvent etre acceptees.',
          });
        }

        // The effective fee: counter amount if counter-accepted, else original offer
        const effectiveFee = isCounterAccept && offer.counterOffer != null
          ? offer.counterOffer
          : offer.offeredFee;

        // Terminate active contract
        const activeContract = offer.player.contracts[0];
        if (activeContract) {
          await tx.contract.update({
            where: { id: activeContract.id },
            data: {
              status: ContractStatus.TERMINATED,
              terminatedAt: new Date(),
              notes: `Transfert accepte vers ${offer.fromTeam.name} (${effectiveFee}).`,
            },
          });
        }

        // Create new contract for buying team
        await tx.contract.create({
          data: {
            playerId: offer.playerId,
            teamId: offer.fromTeamId,
            salary: 0,
            durationBo3: 10,
            releaseClause: activeContract?.releaseClause ?? 0,
            transferFee: effectiveFee,
            status: ContractStatus.PENDING_APPROVAL,
            notes: isCounterAccept
              ? `Contre-proposition acceptee depuis ${offer.toTeam.name}.`
              : `Transfert accepte depuis ${offer.toTeam.name}.`,
          },
        });

        // Update player's team
        await tx.player.update({
          where: { id: offer.playerId },
          data: { teamId: offer.fromTeamId, salary: 0 },
        });

        const accepted = await tx.transferOffer.update({
          where: { id: input.id },
          data: { status: TransferOfferStatus.ACCEPTED, respondedAt: new Date() },
          select: { id: true, status: true },
        });

        // Notify all captains of the other party
        const notifyCaptains = isCounterAccept ? offer.toTeam.captains : offer.fromTeam.captains;
        for (const cap of notifyCaptains) {
          await createNotification(tx as unknown as PrismaClient, {
            userId: cap.id,
            type: 'TRANSFER_ACCEPTED',
            title: isCounterAccept ? 'Contre-proposition acceptee' : 'Offre acceptee',
            message: isCounterAccept
              ? `${offer.fromTeam.name} a accepte votre contre-proposition de ${effectiveFee} pour ${playerDisplayName}. Contrat en attente de validation admin.`
              : `${offer.toTeam.name} a accepte votre offre pour ${playerDisplayName}. Contrat en attente de validation admin.`,
            link: '/team',
            metadata: { offerId: offer.id, playerId: offer.playerId },
          });
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'ACCEPT',
            entity: 'TransferOffer',
            entityId: input.id,
            details: { playerId: offer.playerId, effectiveFee, isCounterAccept },
          }),
        });

        return accepted;
      });
    }),

  reject: captainProcedure
    .input(transferOfferRespondSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const offer = await tx.transferOffer.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            playerId: true,
            fromTeamId: true,
            toTeamId: true,
            offeredFee: true,
            status: true,
            player: { select: { firstName: true, lastName: true, gameName: true } },
            fromTeam: { select: { name: true, captains: { select: { id: true } } } },
            toTeam: { select: { name: true, captains: { select: { id: true } } } },
          },
        });

        if (!offer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable.' });
        }

        // PENDING → selling team rejects. COUNTER_PROPOSED → buying team rejects the counter.
        const playerDisplayName = resolveStoredPlayerDisplayName(offer.player);
        const isCounterReject = offer.status === TransferOfferStatus.COUNTER_PROPOSED;
        const rejectingTeamId = isCounterReject ? offer.fromTeamId : offer.toTeamId;
        ensureTeamAccess(ctx.session.user, rejectingTeamId);

        if (
          offer.status !== TransferOfferStatus.PENDING &&
          offer.status !== TransferOfferStatus.COUNTER_PROPOSED
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seules les offres en attente ou en contre-proposition peuvent etre rejetees.',
          });
        }

        const rejected = await tx.transferOffer.update({
          where: { id: input.id },
          data: {
            status: TransferOfferStatus.REJECTED,
            respondedAt: new Date(),
            ...(input.rejectionReason ? { rejectionReason: input.rejectionReason } : {}),
          },
          select: { id: true, status: true },
        });

        // Notify all captains of the other party
        const notifyCaptains = isCounterReject ? offer.toTeam.captains : offer.fromTeam.captains;
        for (const cap of notifyCaptains) {
          await createNotification(tx as unknown as PrismaClient, {
            userId: cap.id,
            type: 'TRANSFER_REJECTED',
            title: isCounterReject ? 'Contre-proposition refusee' : 'Offre refusee',
            message: isCounterReject
              ? `${offer.fromTeam.name} a refuse votre contre-proposition pour ${playerDisplayName}.${input.rejectionReason ? ` Motif: ${input.rejectionReason}` : ''}`
              : `${offer.toTeam.name} a refuse votre offre pour ${playerDisplayName}.${input.rejectionReason ? ` Motif: ${input.rejectionReason}` : ''}`,
            link: '/team',
            metadata: { offerId: offer.id, playerId: offer.playerId },
          });
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'REJECT',
            entity: 'TransferOffer',
            entityId: input.id,
            details: {
              playerId: offer.playerId,
              reason: input.rejectionReason ?? null,
            },
          }),
        });

        return rejected;
      });
    }),

  cancel: captainProcedure
    .input(transferOfferIdSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.transferOffer.findUnique({
        where: { id: input.id },
        select: { id: true, fromTeamId: true, status: true },
      });

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable.' });
      }

      ensureTeamAccess(ctx.session.user, offer.fromTeamId);

      if (offer.status !== TransferOfferStatus.PENDING) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seules les offres en attente peuvent etre annulees.',
        });
      }

      return ctx.prisma.transferOffer.update({
        where: { id: input.id },
        data: { status: TransferOfferStatus.CANCELLED },
        select: { id: true, status: true },
      });
    }),

  counterPropose: captainProcedure
    .input(transferCounterProposeSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const offer = await tx.transferOffer.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            playerId: true,
            fromTeamId: true,
            toTeamId: true,
            offeredFee: true,
            status: true,
            player: { select: { firstName: true, lastName: true, gameName: true } },
            fromTeam: { select: { name: true, captains: { select: { id: true } } } },
            toTeam: { select: { name: true } },
          },
        });

        if (!offer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable.' });
        }

        const playerDisplayName = resolveStoredPlayerDisplayName(offer.player);

        // Only the selling team captain can counter-propose
        ensureTeamAccess(ctx.session.user, offer.toTeamId);

        if (offer.status !== TransferOfferStatus.PENDING) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seules les offres en attente peuvent recevoir une contre-proposition.',
          });
        }

        if (input.counterOffer <= offer.offeredFee) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'La contre-proposition doit etre superieure au montant initial.',
          });
        }

        const updated = await tx.transferOffer.update({
          where: { id: input.id },
          data: {
            status: TransferOfferStatus.COUNTER_PROPOSED,
            counterOffer: input.counterOffer,
            ...(input.counterMessage ? { counterMessage: input.counterMessage } : {}),
          },
          select: { id: true, status: true, counterOffer: true },
        });

        // Notify all buying team captains
        for (const cap of offer.fromTeam.captains) {
          await createNotification(tx as unknown as PrismaClient, {
            userId: cap.id,
            type: 'TRANSFER_COUNTER_PROPOSED',
            title: 'Contre-proposition recue',
            message: `${offer.toTeam.name} contre-propose ${input.counterOffer} pour ${playerDisplayName}${input.counterMessage ? ` : "${input.counterMessage}"` : ''}.`,
            link: '/team',
            metadata: { offerId: offer.id, playerId: offer.playerId },
          });
        }

        await tx.auditLog.create({
          data: buildAuditLogInput({
            userId: ctx.session.user.id,
            action: 'COUNTER_PROPOSE',
            entity: 'TransferOffer',
            entityId: input.id,
            details: { counterOffer: input.counterOffer },
          }),
        });

        return updated;
      });
    }),
});
