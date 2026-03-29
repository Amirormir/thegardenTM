import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAdminCaller, createCaptainCaller, createMockPrisma, createPublicCaller } from '@/test/helpers';

describe('transfer router', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  // ─── getByTeam ─────────────────────────────────────────────────────

  describe('getByTeam', () => {
    it('returns incoming transfer offers for a team', async () => {
      const offers = [{ id: 'o-1', status: 'PENDING', offeredFee: 500000 }];
      (prisma.transferOffer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(offers);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.getByTeam({ teamId: 'team-1', direction: 'incoming' });

      expect(result).toEqual(offers);
      expect(prisma.transferOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toTeamId: 'team-1' },
        }),
      );
    });

    it('returns outgoing transfer offers for a team', async () => {
      (prisma.transferOffer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.transfer.getByTeam({ teamId: 'team-1', direction: 'outgoing' });

      expect(prisma.transferOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromTeamId: 'team-1' },
        }),
      );
    });

    it('defaults to incoming direction', async () => {
      (prisma.transferOffer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.transfer.getByTeam({ teamId: 'team-1' });

      expect(prisma.transferOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toTeamId: 'team-1' },
        }),
      );
    });

    it('rejects captain accessing another team', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.getByTeam({ teamId: 'team-2' })).rejects.toThrow('own team');
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.transfer.getByTeam({ teamId: 'team-1' })).rejects.toThrow(TRPCError);
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const validInput = {
      playerId: 'player-1',
      fromTeamId: 'team-1',
      offeredFee: 500000,
    };

    function setupCreateMocks(overrides: {
      releaseClause?: number;
      playerTeamId?: string;
      budget?: number;
      existingPayroll?: number;
    } = {}) {
      const {
        releaseClause = 1000000,
        playerTeamId = 'team-2',
        budget = 2000000,
        existingPayroll = 0,
      } = overrides;

      const player = {
        id: 'player-1',
        gameName: 'TestPlayer',
        teamId: playerTeamId,
        contracts: [{ id: 'c-1', teamId: playerTeamId, releaseClause }],
      };
      const fromTeam = { id: 'team-1', name: 'Buying Team', budget };
      const sellingTeam = { id: playerTeamId, name: 'Selling Team', captainId: 'captain-selling' };
      const offer = { id: 'o-new', status: 'PENDING', offeredFee: validInput.offeredFee, fromTeamId: 'team-1', toTeamId: playerTeamId };

      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(player);
      (prisma.team.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(fromTeam)
        .mockResolvedValueOnce(sellingTeam);
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingPayroll > 0 ? [{ salary: existingPayroll }] : [],
      );
      (prisma.transferOffer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.transferOffer.create as ReturnType<typeof vi.fn>).mockResolvedValue(offer);
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.contract.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      return { player, fromTeam, sellingTeam, offer };
    }

    it('creates a pending offer when below release clause', async () => {
      const { offer } = setupCreateMocks({ releaseClause: 1000000 });

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.create(validInput);

      expect(result).toEqual(offer);
      expect(prisma.transferOffer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('auto-accepts when offer >= release clause', async () => {
      const autoAcceptedOffer = { id: 'o-new', status: 'ACCEPTED', offeredFee: 1000000, fromTeamId: 'team-1', toTeamId: 'team-2' };
      setupCreateMocks({ releaseClause: 500000 });
      (prisma.transferOffer.create as ReturnType<typeof vi.fn>).mockResolvedValue(autoAcceptedOffer);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.create(validInput);

      expect(result.status).toBe('ACCEPTED');
      // Should terminate old contract
      expect(prisma.contract.update).toHaveBeenCalled();
      // Should create new contract
      expect(prisma.contract.create).toHaveBeenCalled();
      // Should update player's team
      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'player-1' },
          data: expect.objectContaining({ teamId: 'team-1' }),
        }),
      );
    });

    it('creates notification for selling team captain', async () => {
      setupCreateMocks();

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.transfer.create(validInput);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'captain-selling',
            type: 'TRANSFER_OFFER_RECEIVED',
          }),
        }),
      );
    });

    it('rejects offer for free agent', async () => {
      setupCreateMocks({ playerTeamId: 'team-2' });
      // Override player to be a free agent
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'player-1', gameName: 'X', teamId: null, contracts: [],
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('free agent');
    });

    it('rejects offer for own player', async () => {
      setupCreateMocks({ playerTeamId: 'team-1' });
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'player-1', gameName: 'X', teamId: 'team-1', contracts: [{ id: 'c-1', teamId: 'team-1', releaseClause: 500000 }],
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('deja dans votre');
    });

    it('rejects duplicate pending offer', async () => {
      setupCreateMocks();
      (prisma.transferOffer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'o-existing' });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('deja une offre');
    });

    it('rejects when budget is insufficient for transfer fee', async () => {
      setupCreateMocks({ budget: 400000, existingPayroll: 200000 });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.transfer.create({ ...validInput, offeredFee: 250000 }),
      ).rejects.toThrow('Budget insuffisant');
    });

    it('rejects player without active contract', async () => {
      setupCreateMocks();
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'player-1', gameName: 'X', teamId: 'team-2', contracts: [],
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('contrat actif');
    });

    it('creates audit log entry', async () => {
      setupCreateMocks();
      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.transfer.create(validInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            entity: 'TransferOffer',
          }),
        }),
      );
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow(TRPCError);
    });
  });

  // ─── accept ────────────────────────────────────────────────────────

  describe('accept', () => {
    function setupAcceptMocks() {
      const offer = {
        id: 'o-1',
        playerId: 'player-1',
        fromTeamId: 'team-1',
        toTeamId: 'team-2',
        offeredFee: 500000,
        status: 'PENDING',
        player: {
          id: 'player-1',
          gameName: 'TestPlayer',
          contracts: [{ id: 'c-1', releaseClause: 1000000 }],
        },
        fromTeam: { id: 'team-1', name: 'Buying Team', captainId: 'captain-1' },
        toTeam: { id: 'team-2', name: 'Selling Team' },
      };

      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(offer);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.contract.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.transferOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'o-1', status: 'ACCEPTED' });
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      return offer;
    }

    it('accepts a pending offer', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      const result = await caller.transfer.accept({ id: 'o-1' });

      expect(result.status).toBe('ACCEPTED');
    });

    it('terminates old contract on accept', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.accept({ id: 'o-1' });

      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: expect.objectContaining({ status: 'TERMINATED' }),
        }),
      );
    });

    it('creates new PENDING_APPROVAL contract for buying team', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.accept({ id: 'o-1' });

      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playerId: 'player-1',
            teamId: 'team-1',
            status: 'PENDING_APPROVAL',
            transferFee: 500000,
          }),
        }),
      );
    });

    it('moves player to buying team', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.accept({ id: 'o-1' });

      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'player-1' },
          data: expect.objectContaining({ teamId: 'team-1' }),
        }),
      );
    });

    it('notifies buying team captain', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.accept({ id: 'o-1' });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'captain-1',
            type: 'TRANSFER_ACCEPTED',
          }),
        }),
      );
    });

    it('rejects non-pending offer', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', status: 'REJECTED', toTeamId: 'team-2',
      });

      const { caller } = createCaptainCaller('team-2', prisma);
      await expect(caller.transfer.accept({ id: 'o-1' })).rejects.toThrow('en attente');
    });

    it('rejects captain of wrong team', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.accept({ id: 'o-1' })).rejects.toThrow('own team');
    });

    it('rejects offer not found', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createCaptainCaller('team-2', prisma);
      await expect(caller.transfer.accept({ id: 'nonexistent' })).rejects.toThrow('introuvable');
    });
  });

  // ─── reject ────────────────────────────────────────────────────────

  describe('reject', () => {
    function setupRejectMocks() {
      const offer = {
        id: 'o-1',
        playerId: 'player-1',
        fromTeamId: 'team-1',
        toTeamId: 'team-2',
        offeredFee: 500000,
        status: 'PENDING',
        player: { gameName: 'TestPlayer' },
        fromTeam: { name: 'Buying Team', captainId: 'captain-1' },
        toTeam: { name: 'Selling Team' },
      };

      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(offer);
      (prisma.transferOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'o-1', status: 'REJECTED' });
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      return offer;
    }

    it('rejects a pending offer', async () => {
      setupRejectMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      const result = await caller.transfer.reject({ id: 'o-1' });

      expect(result.status).toBe('REJECTED');
    });

    it('stores rejection reason', async () => {
      setupRejectMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.reject({ id: 'o-1', rejectionReason: 'Price too low' });

      expect(prisma.transferOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rejectionReason: 'Price too low' }),
        }),
      );
    });

    it('notifies buying team captain with reason', async () => {
      setupRejectMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      await caller.transfer.reject({ id: 'o-1', rejectionReason: 'Not enough' });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'captain-1',
            type: 'TRANSFER_REJECTED',
          }),
        }),
      );
    });

    it('rejects non-pending offer', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', status: 'ACCEPTED', toTeamId: 'team-2',
      });

      const { caller } = createCaptainCaller('team-2', prisma);
      await expect(caller.transfer.reject({ id: 'o-1' })).rejects.toThrow('en attente');
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancels a pending offer', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', fromTeamId: 'team-1', status: 'PENDING',
      });
      (prisma.transferOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', status: 'CANCELLED',
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.cancel({ id: 'o-1' });

      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancelling non-pending offer', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', fromTeamId: 'team-1', status: 'ACCEPTED',
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.cancel({ id: 'o-1' })).rejects.toThrow('en attente');
    });

    it('rejects captain cancelling another team\'s offer', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1', fromTeamId: 'team-2', status: 'PENDING',
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.cancel({ id: 'o-1' })).rejects.toThrow('own team');
    });

    it('rejects offer not found', async () => {
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.cancel({ id: 'nonexistent' })).rejects.toThrow('introuvable');
    });
  });
});
