import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSplashUrl,
  buildSquareUrl,
  syncChampionsToDatabase,
  type DataDragonChampionEntry,
} from './data-dragon';
import { createMockPrisma } from '@/test/helpers';
import type { TRPCContext } from '@/server/context';

type MockPrisma = ReturnType<typeof createMockPrisma>;

type ChampionRow = { id: string };
type ChampionUpsertData = {
  name: string;
  title: string;
  splashUrl: string;
  squareUrl: string;
  patchVersion: string;
  roles?: unknown;
  enabled?: unknown;
};

type ChampionUpsertArgs = {
  where: { id: string };
  create: { id: string } & ChampionUpsertData;
  update: ChampionUpsertData;
};

function makeEntry(
  id: string,
  overrides: Partial<DataDragonChampionEntry> = {},
): DataDragonChampionEntry {
  return {
    id,
    key: '0',
    name: id,
    title: `the ${id}`,
    tags: ['Fighter'],
    ...overrides,
  };
}

function asPrisma(mock: MockPrisma) {
  return mock as unknown as TRPCContext['prisma'];
}

function setChampionFindManyResult(prisma: MockPrisma, rows: ChampionRow[]) {
  const findManyMock = prisma.champion.findMany as unknown as {
    mockResolvedValue: (value: ChampionRow[]) => unknown;
  };
  findManyMock.mockResolvedValue(rows);
}

function getChampionUpsertCalls(prisma: MockPrisma): ChampionUpsertArgs[] {
  const upsertMock = prisma.champion.upsert as unknown as {
    mock: { calls: [ChampionUpsertArgs][] };
  };
  return upsertMock.mock.calls.map(([args]) => args);
}

describe('buildSplashUrl', () => {
  it('builds the splash CDN url with the _0 skin', () => {
    expect(buildSplashUrl('Aatrox')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg',
    );
  });
});

describe('buildSquareUrl', () => {
  it('embeds the patch version in the URL', () => {
    expect(buildSquareUrl('Ahri', '14.23.1')).toBe(
      'https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Ahri.png',
    );
  });
});

describe('syncChampionsToDatabase', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it('throws if the entries list is empty', async () => {
    await expect(
      syncChampionsToDatabase({ prisma: asPrisma(prisma), version: '14.23.1', entries: [] }),
    ).rejects.toThrow(/no champions/i);
  });

  it('counts inserts and updates separately', async () => {
    setChampionFindManyResult(prisma, [{ id: 'Aatrox' }]);

    const entries = [makeEntry('Aatrox'), makeEntry('Ahri'), makeEntry('Akali')];
    const result = await syncChampionsToDatabase({
      prisma: asPrisma(prisma),
      version: '14.23.1',
      entries,
    });

    expect(result).toMatchObject({
      patchVersion: '14.23.1',
      total: 3,
      inserted: 2,
      updated: 1,
    });
    expect(getChampionUpsertCalls(prisma)).toHaveLength(3);
  });

  it('preserves existing roles/enabled by not touching them on upsert', async () => {
    setChampionFindManyResult(prisma, [{ id: 'Ahri' }]);

    await syncChampionsToDatabase({
      prisma: asPrisma(prisma),
      version: '14.23.1',
      entries: [makeEntry('Ahri', { title: 'the Nine-Tailed Fox' })],
    });

    const calls = getChampionUpsertCalls(prisma);
    expect(calls).not.toHaveLength(0);
    const call = calls[0]!;
    expect(call.update).not.toHaveProperty('roles');
    expect(call.update).not.toHaveProperty('enabled');
    expect(call.create).not.toHaveProperty('roles');
    expect(call.create).not.toHaveProperty('enabled');
    expect(call.update.title).toBe('the Nine-Tailed Fox');
  });

  it('embeds the patch version in the square URL', async () => {
    await syncChampionsToDatabase({
      prisma: asPrisma(prisma),
      version: '15.1.1',
      entries: [makeEntry('Aatrox')],
    });

    const calls = getChampionUpsertCalls(prisma);
    expect(calls).not.toHaveLength(0);
    const call = calls[0]!;
    expect(call.create.squareUrl).toContain('15.1.1');
    expect(call.create.patchVersion).toBe('15.1.1');
  });
});
