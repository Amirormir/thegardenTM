import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createCaptainCaller, createMockPrisma, createPublicCaller } from '@/test/helpers';

describe('team router — budget conversion', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  function mockSettings(boMaxRegularSeason = 18) {
    (prisma.leagueSettings.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      boMaxRegularSeason,
      transferWindowOpen: true,
      transferWindowStart: null,
      transferWindowEnd: null,
      contractExpiryNoticeDays: 30,
      updatedAt: new Date(),
    });
    (prisma.leagueSettings.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      boMaxRegularSeason,
      transferWindowOpen: true,
      transferWindowStart: null,
      transferWindowEnd: null,
      contractExpiryNoticeDays: 30,
    });
  }

  describe('getBudgetSnapshot', () => {
    it('returns budget snapshot with conversion rates', async () => {
      mockSettings(18);
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'team-1',
        name: 'A',
        shortCode: 'A',
        transferBudget: 1_800_000,
        salaryBudgetCap: 500_000,
        players: [{ id: 'p-1', salary: 100_000 }, { id: 'p-2', salary: 50_000 }],
      });

      const { caller } = createCaptainCaller('team-1', prisma);
      const snap = await caller.team.getBudgetSnapshot({ teamId: 'team-1' });

      expect(snap.payroll).toBe(150_000);
      expect(snap.salaryRemaining).toBe(350_000);
      expect(snap.nUsed).toBe(18);
      expect(snap.conversion.transferToSalaryRate).toBeCloseTo(1 / 18);
      expect(snap.conversion.salaryToTransferRate).toBe(18);
      expect(snap.conversion.maxTransferToSalary).toBe(1_800_000);
      expect(snap.conversion.maxSalaryToTransfer).toBe(350_000);
    });

    it('rejects captain of another team', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(caller.team.getBudgetSnapshot({ teamId: 'team-2' })).rejects.toThrow('own team');
    });

    it('rejects unauthenticated', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(caller.team.getBudgetSnapshot({ teamId: 'team-1' })).rejects.toThrow();
    });
  });

  describe('convertBudget', () => {
    function mockTeam(transferBudget: number, salaryBudgetCap: number, payroll = 0) {
      (prisma.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'team-1',
        transferBudget,
        salaryBudgetCap,
        players: payroll > 0 ? [{ salary: payroll }] : [],
      });
      (prisma.team.update as ReturnType<typeof vi.fn>).mockImplementation(({ data }: { data: { transferBudget: number; salaryBudgetCap: number } }) =>
        Promise.resolve({
          id: 'team-1',
          transferBudget: data.transferBudget,
          salaryBudgetCap: data.salaryBudgetCap,
        }),
      );
    }

    it('converts transfer budget to salary cap using N=18', async () => {
      mockSettings(18);
      mockTeam(1_800_000, 500_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.team.convertBudget({
        teamId: 'team-1',
        direction: 'TRANSFER_TO_SALARY',
        amount: 900_000,
      });

      expect(result.transferBudget).toBe(900_000);
      expect(result.salaryBudgetCap).toBe(500_000 + 50_000);
      expect(prisma.budgetConversion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'TRANSFER_TO_SALARY',
            amount: 900_000,
            nUsed: 18,
          }),
        }),
      );
    });

    it('converts salary cap to transfer budget using N', async () => {
      mockSettings(18);
      mockTeam(0, 500_000, 100_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      const result = await caller.team.convertBudget({
        teamId: 'team-1',
        direction: 'SALARY_TO_TRANSFER',
        amount: 100_000,
      });

      expect(result.transferBudget).toBe(100_000 * 18);
      expect(result.salaryBudgetCap).toBe(400_000);
    });

    it('rejects TRANSFER_TO_SALARY when amount exceeds transfer budget', async () => {
      mockSettings(18);
      mockTeam(100_000, 500_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.team.convertBudget({
          teamId: 'team-1',
          direction: 'TRANSFER_TO_SALARY',
          amount: 500_000,
        }),
      ).rejects.toThrow('Budget transfert insuffisant');
    });

    it('rejects TRANSFER_TO_SALARY when amount is below minimum N', async () => {
      mockSettings(18);
      mockTeam(1_800_000, 500_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.team.convertBudget({
          teamId: 'team-1',
          direction: 'TRANSFER_TO_SALARY',
          amount: 17,
        }),
      ).rejects.toThrow('Montant trop faible');
    });

    it('rejects SALARY_TO_TRANSFER when new cap would drop below payroll', async () => {
      mockSettings(18);
      mockTeam(0, 500_000, 400_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.team.convertBudget({
          teamId: 'team-1',
          direction: 'SALARY_TO_TRANSFER',
          amount: 200_000,
        }),
      ).rejects.toThrow('sous la masse salariale');
    });

    it('creates audit log entry', async () => {
      mockSettings(18);
      mockTeam(1_800_000, 500_000);

      const { caller } = createCaptainCaller('team-1', prisma);
      await caller.team.convertBudget({
        teamId: 'team-1',
        direction: 'TRANSFER_TO_SALARY',
        amount: 900_000,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CONVERT_BUDGET',
            entity: 'Team',
          }),
        }),
      );
    });

    it('rejects captain of another team', async () => {
      const { caller } = createCaptainCaller('team-1', prisma);
      await expect(
        caller.team.convertBudget({
          teamId: 'team-2',
          direction: 'TRANSFER_TO_SALARY',
          amount: 1000,
        }),
      ).rejects.toThrow('own team');
    });

    it('rejects unauthenticated', async () => {
      const { caller } = createPublicCaller(prisma);
      await expect(
        caller.team.convertBudget({
          teamId: 'team-1',
          direction: 'TRANSFER_TO_SALARY',
          amount: 1000,
        }),
      ).rejects.toThrow();
    });
  });
});
