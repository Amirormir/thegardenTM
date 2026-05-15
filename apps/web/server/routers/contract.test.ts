import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAdminCaller, createCaptainCaller, createMockPrisma, createPublicCaller } from '@/test/helpers';

describe('contract router', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  // ─��─ getByPlayer ───────────────────────────────────────────────────

  describe('getByPlayer', () => {
    it('returns contracts for a player (public)', async () => {
      const contracts = [
        { id: 'c-1', status: 'ACTIVE', salary: 200000 },
      ];
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(contracts);

      const { caller } = createPublicCaller(prisma);
      const result = await caller.contract.getByPlayer({ playerId: 'player-1' });

      expect(result).toEqual(contracts);
      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { playerId: 'player-1' },
        }),
      );
    });
  });

  // ─── getByTeam ─────────────────────────────────────────────────────

  describe('getByTeam', () => {
    it('returns contracts for a captain\'s team', async () => {
      const contracts = [{
        id: 'c-1',
        status: 'ACTIVE',
        player: { id: 'p-1', firstName: 'A', lastName: 'B', gameName: 'AB' },
      }];
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(contracts);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.contract.getByTeam({ teamId: 'team-1' });

      expect(result[0]?.id).toBe('c-1');
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.contract.getByTeam({ teamId: 'team-1' })).rejects.toThrow(TRPCError);
    });

    it('rejects captain accessing another team', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.getByTeam({ teamId: 'team-2' })).rejects.toThrow('own team');
    });

    it('allows admin to access any team', async () => {
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.getByTeam({ teamId: 'team-1' });
      expect(result).toEqual([]);
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    const validInput = {
      playerId: 'player-1',
      teamId: 'team-1',
      salary: 150000,
      durationBo3: 10,
      releaseClause: 500000,
    };

    function setupCreateMocks() {
      const team = { id: 'team-1', name: 'Test Team', salaryBudgetCap: 1200000 };
      const player = { id: 'player-1', gameName: 'TestPlayer', teamId: null };
      const budgetContracts: { id: string; salary: number }[] = [];
      const activePlayerContracts: { id: string; teamId: string }[] = [];
      const created = { id: 'c-new', playerId: 'player-1', teamId: 'team-1', status: 'PENDING_APPROVAL' };

      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(team);
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(player);
      (prisma.contract.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(budgetContracts)
        .mockResolvedValueOnce(activePlayerContracts);
      (prisma.contract.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      return { team, player, created };
    }

    it('creates a contract with PENDING_APPROVAL status', async () => {
      const { created } = setupCreateMocks();
      const { caller } = createCaptainCaller('team-1', prisma);

      const result = await caller.contract.create(validInput);
      expect(result).toEqual(created);
      expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('rejects when team not found', async () => {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p-1', gameName: 'X', teamId: null });
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.create(validInput)).rejects.toThrow('Team not found');
    });

    it('rejects when player not found', async () => {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'team-1', name: 'T', salaryBudgetCap: 1000000 });
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.create(validInput)).rejects.toThrow('Player not found');
    });

    it('rejects player on another team', async () => {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'team-1', name: 'T', salaryBudgetCap: 1000000 });
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p-1', gameName: 'X', teamId: 'team-2' });
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]).mockResolvedValue([]);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.create(validInput)).rejects.toThrow('free agents');
    });

    it('rejects when salary exceeds budget', async () => {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'team-1', name: 'T', salaryBudgetCap: 100000 });
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p-1', gameName: 'X', teamId: null });
      (prisma.contract.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'c-x', salary: 50000 }]) // budget contracts
        .mockResolvedValueOnce([]); // active player contracts

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.contract.create({ ...validInput, salary: 60000 }),
      ).rejects.toThrow('Masse salariale depassee');
    });

    it('rejects duplicate active contract for same player and team', async () => {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'team-1', name: 'T', salaryBudgetCap: 1000000 });
      (prisma.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'p-1', gameName: 'X', teamId: null });
      (prisma.contract.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // budget contracts
        .mockResolvedValueOnce([{ id: 'c-existing', teamId: 'team-1' }]); // active player contracts

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.create(validInput)).rejects.toThrow('already has an active');
    });

    it('creates audit log entry', async () => {
      setupCreateMocks();
      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.contract.create(validInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            entity: 'Contract',
          }),
        }),
      );
    });

    it('rejects unauthenticated access', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.contract.create(validInput)).rejects.toThrow(TRPCError);
    });
  });

  // ─── approve ───────────────────────────────────────────────────────

  describe('approve', () => {
    it('approves a pending contract', async () => {
      const existing = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'PENDING_APPROVAL', salary: 150000 };
      const team = { id: 'team-1', name: 'T', salaryBudgetCap: 1000000 };
      const approved = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'ACTIVE', salary: 150000 };

      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(team);
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue(approved);
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.approve({ id: 'c-1' });

      expect(result.status).toBe('ACTIVE');
      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({ teamId: 'team-1' }),
        }),
      );
    });

    it('rejects non-pending contract', async () => {
      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'c-1', status: 'ACTIVE', salary: 100000,
      });

      const { caller } = createAdminCaller(prisma);
      await expect(caller.contract.approve({ id: 'c-1' })).rejects.toThrow('pending');
    });

    it('rejects when budget exceeded at approval time', async () => {
      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'PENDING_APPROVAL', salary: 800000,
      });
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'team-1', name: 'T', salaryBudgetCap: 1000000 });
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ salary: 300000 }]);

      const { caller } = createAdminCaller(prisma);
      await expect(caller.contract.approve({ id: 'c-1' })).rejects.toThrow('Masse salariale depassee');
    });

    it('rejects contract not found', async () => {
      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createAdminCaller(prisma);
      await expect(caller.contract.approve({ id: 'nonexistent' })).rejects.toThrow('not found');
    });

    it('rejects non-admin caller', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.approve({ id: 'c-1' })).rejects.toThrow(TRPCError);
    });
  });

  // ─── reject ────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects a pending contract', async () => {
      const existing = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'PENDING_APPROVAL' };
      const rejected = { id: 'c-1', status: 'TERMINATED' };

      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue(rejected);
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.reject({ id: 'c-1', reason: 'Budget concerns' });

      expect(result.status).toBe('TERMINATED');
    });

    it('rejects non-pending contract', async () => {
      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'c-1', status: 'ACTIVE',
      });

      const { caller } = createAdminCaller(prisma);
      await expect(caller.contract.reject({ id: 'c-1' })).rejects.toThrow('pending');
    });

    it('rejects non-admin caller', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.reject({ id: 'c-1' })).rejects.toThrow(TRPCError);
    });
  });

  // ─── terminate ─────────────────────────────────────────────────────

  describe('terminate', () => {
    it('terminates an active contract', async () => {
      const existing = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'ACTIVE' };
      const terminated = { id: 'c-1', teamId: 'team-1', status: 'TERMINATED', terminatedAt: new Date() };

      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue(terminated);
      (prisma.contract.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.contract.terminate({ id: 'c-1' });

      expect(result.status).toBe('TERMINATED');
    });

    it('sets player to free agent when no fallback contract', async () => {
      const existing = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'ACTIVE' };

      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c-1', teamId: 'team-1', status: 'TERMINATED', terminatedAt: new Date() });
      (prisma.contract.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.contract.terminate({ id: 'c-1' });

      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ teamId: null, salary: 0 }),
        }),
      );
    });

    it('falls back to another active contract', async () => {
      const existing = { id: 'c-1', playerId: 'p-1', teamId: 'team-1', status: 'ACTIVE' };
      const fallback = { teamId: 'team-2', salary: 100000 };

      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.contract.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c-1', teamId: 'team-1', status: 'TERMINATED', terminatedAt: new Date() });
      (prisma.contract.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(fallback);
      (prisma.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.contract.terminate({ id: 'c-1' });

      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ teamId: 'team-2', salary: 100000 }),
        }),
      );
    });

    it('rejects captain terminating contract of another team', async () => {
      (prisma.contract.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'c-1', playerId: 'p-1', teamId: 'team-2', status: 'ACTIVE',
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.terminate({ id: 'c-1' })).rejects.toThrow('own team');
    });
  });

  // ─── getPendingApprovals ───────────────────────────────────────────

  describe('getPendingApprovals', () => {
    it('returns pending contracts for admin', async () => {
      const pending = [{
        id: 'c-1',
        status: 'PENDING_APPROVAL',
        player: { id: 'p-1', firstName: 'A', lastName: 'B', gameName: 'AB' },
        team: { id: 't-1', name: 'T', shortCode: 'TTT', salaryBudgetCap: 1000 },
      }];
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pending);

      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.getPendingApprovals();

      expect(result[0]?.id).toBe('c-1');
    });

    it('rejects non-admin caller', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.getPendingApprovals()).rejects.toThrow(TRPCError);
    });
  });

  // ─── processExpirations ────────────────────────────────────────────

  describe('processExpirations', () => {
    function mockSettings(contractExpiryNoticeDays = 30) {
      (prisma.leagueSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        boMaxRegularSeason: 18,
        transferWindowOpen: true,
        transferWindowStart: null,
        transferWindowEnd: null,
        contractExpiryNoticeDays,
      });
    }

    it('expires contracts past expiresAt and frees players', async () => {
      mockSettings();
      const expiredContracts = [{
        id: 'c-1',
        playerId: 'p-1',
        teamId: 't-1',
        player: { firstName: 'A', lastName: 'B', gameName: 'AB' },
        team: { name: 'T', captains: [{ id: 'cap-1' }] },
      }];
      (prisma.contract.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(expiredContracts)
        .mockResolvedValueOnce([]);

      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.processExpirations();

      expect(result.expired).toBe(1);
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: expect.objectContaining({ status: 'EXPIRED' }),
        }),
      );
      expect(prisma.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: { teamId: null, salary: 0 },
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'cap-1',
            type: 'CONTRACT_EXPIRED',
          }),
        }),
      );
    });

    it('notifies captains for contracts inside the notice window', async () => {
      mockSettings(30);
      const upcoming = [{
        id: 'c-2',
        playerId: 'p-2',
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        player: { firstName: 'C', lastName: 'D', gameName: 'CD' },
        team: { name: 'T', captains: [{ id: 'cap-2' }] },
      }];
      (prisma.contract.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(upcoming);

      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.processExpirations();

      expect(result.notified).toBe(1);
      expect(prisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-2' },
          data: expect.objectContaining({ expiryNotifiedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'cap-2',
            type: 'CONTRACT_EXPIRING_SOON',
          }),
        }),
      );
    });

    it('returns 0/0 when no contracts match', async () => {
      mockSettings();
      (prisma.contract.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const { caller } = createAdminCaller(prisma);
      const result = await caller.contract.processExpirations();
      expect(result).toEqual({ expired: 0, notified: 0 });
    });

    it('rejects non-admin caller', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.contract.processExpirations()).rejects.toThrow();
    });
  });
});
