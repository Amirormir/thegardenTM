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
      const offers = [{
        id: 'o-1',
        status: 'PENDING',
        offeredFee: 500000,
        player: { id: 'p-1', firstName: 'A', lastName: 'B', gameName: 'AB' },
      }];
      (prisma.transferOffer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(offers);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.getByTeam({ teamId: 'team-1', direction: 'incoming' });

      expect(result[0]?.id).toBe('o-1');
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
      transferBudget?: number;
    } = {}) {
      const {
        releaseClause = 1000000,
        playerTeamId = 'team-2',
        transferBudget = 2000000,
      } = overrides;

      const player = {
        id: 'player-1',
        gameName: 'TestPlayer',
        teamId: playerTeamId,
        contracts: [{ id: 'c-1', teamId: playerTeamId, releaseClause }],
      };
      const fromTeam = { id: 'team-1', name: 'Buying Team', transferBudget };
      const sellingTeam = { id: playerTeamId, name: 'Selling Team', captains: [{ id: 'captain-selling' }] };
      const offer = { id: 'o-new', status: 'PENDING', offeredFee: validInput.offeredFee, fromTeamId: 'team-1', toTeamId: playerTeamId };

      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(player);
      (prisma.team.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(fromTeam)
        .mockResolvedValueOnce(sellingTeam);
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

    it('auto-triggers release clause when offer >= release clause', async () => {
      const autoAcceptedOffer = { id: 'o-new', status: 'CONTRACT_IN_PROGRESS', offeredFee: 1000000, fromTeamId: 'team-1', toTeamId: 'team-2' };
      setupCreateMocks({ releaseClause: 500000 });
      (prisma.transferOffer.create as ReturnType<typeof vi.fn>).mockResolvedValue(autoAcceptedOffer);
      (prisma.contract.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c-new' });

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.create(validInput);

      expect(result.status).toBe('CONTRACT_IN_PROGRESS');
      expect(prisma.contract.update).toHaveBeenCalled();
      expect(prisma.contract.create).toHaveBeenCalled();
      expect(prisma.transferOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ linkedContractId: 'c-new' }),
        }),
      );
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

    it('rejects when transfer budget is insufficient for transfer fee', async () => {
      setupCreateMocks({ transferBudget: 400000 });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.transfer.create({ ...validInput, offeredFee: 500000 }),
      ).rejects.toThrow('Budget transfert insuffisant');
    });

    it('rejects an offer below 50% of the player market value', async () => {
      setupCreateMocks();
      // marketValue 2,000,000 → plancher 1,000,000. Offre 500,000 sous le minimum.
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'player-1',
        gameName: 'TestPlayer',
        teamId: 'team-2',
        marketValue: 2000000,
        contracts: [{ id: 'c-1', teamId: 'team-2', releaseClause: 1000000 }],
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.transfer.create({ ...validInput, offeredFee: 500000 }),
      ).rejects.toThrow('minimum autorise');
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

    it('rejects when transfer window is closed', async () => {
      setupCreateMocks();
      (prisma.leagueSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        boMaxRegularSeason: 18,
        transferWindowOpen: false,
        transferWindowStart: null,
        transferWindowEnd: null,
        contractExpiryNoticeDays: 30,
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('mercato');
    });

    it('rejects when current date is before transfer window start', async () => {
      setupCreateMocks();
      const future = new Date(Date.now() + 86_400_000);
      (prisma.leagueSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        boMaxRegularSeason: 18,
        transferWindowOpen: true,
        transferWindowStart: future,
        transferWindowEnd: null,
        contractExpiryNoticeDays: 30,
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('mercato ouvre');
    });

    it('rejects when current date is after transfer window end', async () => {
      setupCreateMocks();
      const past = new Date(Date.now() - 86_400_000);
      (prisma.leagueSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        boMaxRegularSeason: 18,
        transferWindowOpen: true,
        transferWindowStart: null,
        transferWindowEnd: past,
        contractExpiryNoticeDays: 30,
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.create(validInput)).rejects.toThrow('ferme');
    });
  });

  // ─── adminValidate ─────────────────────────────────────────────────

  describe('adminValidate', () => {
    function setupAdminValidateMocks(overrides: { status?: string; transferBudget?: number; offeredFee?: number } = {}) {
      const offer = {
        id: 'o-1',
        playerId: 'player-1',
        fromTeamId: 'team-1',
        toTeamId: 'team-2',
        offeredFee: overrides.offeredFee ?? 500000,
        status: overrides.status ?? 'ACCEPTED',
        player: { id: 'player-1', firstName: 'A', lastName: 'B', gameName: 'AB' },
        fromTeam: {
          id: 'team-1',
          name: 'Buyer',
          transferBudget: overrides.transferBudget ?? 1000000,
          captains: [{ id: 'captain-buyer' }],
        },
        toTeam: { id: 'team-2', name: 'Seller', captains: [{ id: 'captain-seller' }] },
      };
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(offer);
      (prisma.transferOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1',
        status: 'VALIDATED_ADMIN',
        adminValidatedAt: new Date(),
      });
      return offer;
    }

    it('moves an ACCEPTED offer to VALIDATED_ADMIN', async () => {
      setupAdminValidateMocks();
      const { caller } = createAdminCaller(prisma);
      const result = await caller.transfer.adminValidate({ id: 'o-1' });
      expect(result.status).toBe('VALIDATED_ADMIN');
      expect(prisma.transferOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VALIDATED_ADMIN' }),
        }),
      );
    });

    it('rejects non-ACCEPTED offer', async () => {
      setupAdminValidateMocks({ status: 'PENDING' });
      const { caller } = createAdminCaller(prisma);
      await expect(caller.transfer.adminValidate({ id: 'o-1' })).rejects.toThrow('acceptees');
    });

    it('rejects when buyer transfer budget is insufficient', async () => {
      setupAdminValidateMocks({ transferBudget: 100000, offeredFee: 500000 });
      const { caller } = createAdminCaller(prisma);
      await expect(caller.transfer.adminValidate({ id: 'o-1' })).rejects.toThrow('Budget transfert insuffisant');
    });

    it('rejects non-admin caller', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.adminValidate({ id: 'o-1' })).rejects.toThrow();
    });

    it('notifies both teams captains on validation', async () => {
      setupAdminValidateMocks();
      const { caller } = createAdminCaller(prisma);
      await caller.transfer.adminValidate({ id: 'o-1' });
      const calls = (prisma.notification.create as ReturnType<typeof vi.fn>).mock.calls;
      const types = calls.map((c) => (c[0] as { data: { type: string } }).data.type);
      expect(types).toContain('TRANSFER_VALIDATED_ADMIN');
    });
  });

  // ─── startContract ─────────────────────────────────────────────────

  describe('startContract', () => {
    function setupStartContractMocks(overrides: {
      status?: string;
      linkedContractId?: string | null;
      salaryBudgetCap?: number;
      existingPayroll?: number;
    } = {}) {
      const offer = {
        id: 'o-1',
        playerId: 'player-1',
        fromTeamId: 'team-1',
        toTeamId: 'team-2',
        offeredFee: 500000,
        status: overrides.status ?? 'VALIDATED_ADMIN',
        linkedContractId: overrides.linkedContractId ?? null,
        player: { id: 'player-1', firstName: 'A', lastName: 'B', gameName: 'AB' },
        fromTeam: { id: 'team-1', name: 'Buyer', salaryBudgetCap: overrides.salaryBudgetCap ?? 1000000 },
        toTeam: { id: 'team-2', name: 'Seller', captains: [{ id: 'captain-seller' }] },
      };
      (prisma.transferOffer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(offer);
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        overrides.existingPayroll !== undefined ? [{ salary: overrides.existingPayroll }] : [],
      );
      (prisma.contract.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c-new', status: 'PENDING_APPROVAL' });
      (prisma.transferOffer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'o-1',
        status: 'CONTRACT_IN_PROGRESS',
        linkedContractId: 'c-new',
      });
      return offer;
    }

    const validInput = {
      id: 'o-1',
      salary: 100000,
      durationBo3: 12,
      releaseClause: 500000,
    };

    it('creates a PENDING_APPROVAL contract and moves offer to CONTRACT_IN_PROGRESS', async () => {
      setupStartContractMocks();
      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.transfer.startContract(validInput);
      expect(result.status).toBe('CONTRACT_IN_PROGRESS');
      expect(prisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playerId: 'player-1',
            teamId: 'team-1',
            salary: 100000,
            durationBo3: 12,
            releaseClause: 500000,
            transferFee: 500000,
            status: 'PENDING_APPROVAL',
          }),
        }),
      );
      expect(prisma.transferOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ linkedContractId: 'c-new' }),
        }),
      );
    });

    it('rejects when offer is not VALIDATED_ADMIN', async () => {
      setupStartContractMocks({ status: 'PENDING' });
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.startContract(validInput)).rejects.toThrow('valide par l');
    });

    it('rejects when a contract is already linked', async () => {
      setupStartContractMocks({ linkedContractId: 'c-existing' });
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.transfer.startContract(validInput)).rejects.toThrow('deja lie');
    });

    it('rejects when payroll + new salary exceeds cap', async () => {
      setupStartContractMocks({ salaryBudgetCap: 200000, existingPayroll: 150000 });
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.transfer.startContract({ ...validInput, salary: 100000 }),
      ).rejects.toThrow('Masse salariale');
    });

    it('rejects captain of wrong team', async () => {
      setupStartContractMocks();
      const { caller } = createCaptainCaller('team-2', prisma);
      await expect(caller.transfer.startContract(validInput)).rejects.toThrow('own team');
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
        fromTeam: { id: 'team-1', name: 'Buying Team', captains: [{ id: 'captain-1' }] },
        toTeam: { id: 'team-2', name: 'Selling Team', captains: [] },
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

    it('accepts a pending offer (no contract created yet)', async () => {
      setupAcceptMocks();

      const { caller } = createCaptainCaller('team-2', prisma);
      const result = await caller.transfer.accept({ id: 'o-1' });

      expect(result.status).toBe('ACCEPTED');
      // Accept no longer creates a contract or moves the player — that happens
      // post admin-validation via startContract + contract.approve.
      expect(prisma.contract.create).not.toHaveBeenCalled();
      expect(prisma.player.update).not.toHaveBeenCalled();
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
        fromTeam: { name: 'Buying Team', captains: [{ id: 'captain-1' }] },
        toTeam: { name: 'Selling Team', captains: [] },
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
