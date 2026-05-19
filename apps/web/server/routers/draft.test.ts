import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminCaller, createMockPrisma, createPublicCaller, createTestCaller } from '@/test/helpers';

vi.mock('@/lib/riot/data-dragon', () => ({
  fetchLatestPatchVersion: vi.fn().mockResolvedValue('15.1.1'),
}));

describe('draft router', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  // ─── list ────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns drafts sorted by status priority then createdAt desc', async () => {
      const now = new Date('2026-05-18T10:00:00Z');
      const earlier = new Date('2026-05-17T10:00:00Z');
      (prisma.draft.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'd-completed', status: 'COMPLETED', createdAt: now },
        { id: 'd-live', status: 'IN_PROGRESS', createdAt: earlier },
        { id: 'd-lobby', status: 'LOBBY', createdAt: now },
      ]);

      const { caller } = createPublicCaller(prisma);
      const result = await caller.draft.list();

      expect(result.map((d) => d.id)).toEqual(['d-live', 'd-lobby', 'd-completed']);
    });

    it('passes status filter to prisma when provided', async () => {
      const { caller } = createPublicCaller(prisma);
      await caller.draft.list({ status: ['LOBBY'] });

      expect(prisma.draft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['LOBBY'] } }),
        }),
      );
    });

    it('builds an OR filter for teamId', async () => {
      const { caller } = createPublicCaller(prisma);
      await caller.draft.list({ teamId: 'team-1' });

      expect(prisma.draft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ blueTeamId: 'team-1' }, { redTeamId: 'team-1' }],
          }),
        }),
      );
    });
  });

  // ─── byId ────────────────────────────────────────────────────────────

  describe('byId', () => {
    it('returns the draft when found', async () => {
      (prisma.draft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'd-1',
        status: 'LOBBY',
      });

      const { caller } = createPublicCaller(prisma);
      const result = await caller.draft.byId({ id: 'd-1' });

      expect(result).toMatchObject({ id: 'd-1', status: 'LOBBY' });
    });

    it('throws NOT_FOUND when missing', async () => {
      (prisma.draft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createPublicCaller(prisma);
      await expect(caller.draft.byId({ id: 'missing' })).rejects.toThrow(TRPCError);
    });
  });

  // ─── eligibleMatches ─────────────────────────────────────────────────

  describe('eligibleMatches', () => {
    it('rejects non-admin callers', async () => {
      const { caller } = createTestCaller({ prisma, userRole: 'USER' });
      await expect(caller.draft.eligibleMatches()).rejects.toThrow(TRPCError);
    });

    it('returns [] when no current season exists', async () => {
      (prisma.season.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createAdminCaller(prisma);
      const result = await caller.draft.eligibleMatches();

      expect(result).toEqual([]);
      expect(prisma.match.findMany).not.toHaveBeenCalled();
    });

    it('queries non-completed matches in the current season', async () => {
      (prisma.season.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'season-1' });
      (prisma.match.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { caller } = createAdminCaller(prisma);
      await caller.draft.eligibleMatches();

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { seasonId: 'season-1', isCompleted: false },
        }),
      );
    });
  });

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    const matchFixture = {
      id: 'match-1',
      seasonId: 'season-1',
      format: 'BO3' as const,
      homeTeamId: 'home-team',
      awayTeamId: 'away-team',
      isCompleted: false,
    };

    it('rejects non-admin callers', async () => {
      const { caller } = createTestCaller({ prisma, userRole: 'TEAM_CAPTAIN' });
      await expect(
        caller.draft.create({
          matchId: 'match-1',
          gameNumber: 1,
          blueSide: 'HOME',
          fearless: true,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('throws NOT_FOUND if match does not exist', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { caller } = createAdminCaller(prisma);
      await expect(
        caller.draft.create({
          matchId: 'missing',
          gameNumber: 1,
          blueSide: 'HOME',
          fearless: true,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('rejects gameNumber > format max', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...matchFixture,
        format: 'BO1',
      });

      const { caller } = createAdminCaller(prisma);
      await expect(
        caller.draft.create({
          matchId: 'match-1',
          gameNumber: 2,
          blueSide: 'HOME',
          fearless: true,
        }),
      ).rejects.toThrow(/format/i);
    });

    it('rejects when a non-cancelled draft for the same gameNumber already exists', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(matchFixture);
      (prisma.draft.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'existing',
        status: 'LOBBY',
      });

      const { caller } = createAdminCaller(prisma);
      await expect(
        caller.draft.create({
          matchId: 'match-1',
          gameNumber: 1,
          blueSide: 'HOME',
          fearless: true,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('assigns blueTeamId = homeTeamId when blueSide=HOME', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(matchFixture);
      (prisma.draft.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.draft.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-draft',
      });

      const { caller } = createAdminCaller(prisma);
      await caller.draft.create({
        matchId: 'match-1',
        gameNumber: 1,
        blueSide: 'HOME',
        fearless: true,
      });

      const createCall = (prisma.draft.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(createCall.data).toMatchObject({
        blueTeamId: 'home-team',
        redTeamId: 'away-team',
        patchVersion: '15.1.1',
        fearless: true,
        gameNumber: 1,
        format: 'BO3',
      });
    });

    it('swaps blue/red when blueSide=AWAY', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(matchFixture);
      (prisma.draft.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.draft.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-draft' });

      const { caller } = createAdminCaller(prisma);
      await caller.draft.create({
        matchId: 'match-1',
        gameNumber: 2,
        blueSide: 'AWAY',
        fearless: false,
      });

      const createCall = (prisma.draft.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(createCall.data).toMatchObject({
        blueTeamId: 'away-team',
        redTeamId: 'home-team',
      });
    });

    it('creates an AuditLog entry with action=CREATE', async () => {
      (prisma.match.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(matchFixture);
      (prisma.draft.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.draft.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-draft' });

      const { caller } = createAdminCaller(prisma);
      await caller.draft.create({
        matchId: 'match-1',
        gameNumber: 1,
        blueSide: 'HOME',
        fearless: true,
      });

      const auditCalls = (prisma.auditLog.create as ReturnType<typeof vi.fn>).mock.calls;
      expect(auditCalls).not.toHaveLength(0);
      expect(auditCalls[0]?.[0]?.data).toMatchObject({
        action: 'CREATE',
        entity: 'Draft',
      });
    });
  });
});
