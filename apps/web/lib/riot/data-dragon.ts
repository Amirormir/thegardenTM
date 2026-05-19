import type { PrismaClient } from '@nexus/db';

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const FETCH_TIMEOUT_MS = 15_000;

export interface DataDragonChampionEntry {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
}

interface DataDragonChampionsResponse {
  type: string;
  format: string;
  version: string;
  data: Record<string, DataDragonChampionEntry>;
}

export interface ChampionSyncResult {
  patchVersion: string;
  total: number;
  inserted: number;
  updated: number;
  disabledRemoved: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Data Dragon request failed (${response.status}): ${url}`);
  }

  return (await response.json()) as T;
}

export async function fetchLatestPatchVersion(): Promise<string> {
  const versions = await fetchJson<string[]>(`${DDRAGON_BASE}/api/versions.json`);
  const latest = versions[0];

  if (!latest) {
    throw new Error('Data Dragon returned an empty versions list.');
  }

  return latest;
}

export async function fetchChampionsForVersion(
  version: string,
  locale: string = 'fr_FR',
): Promise<DataDragonChampionEntry[]> {
  const payload = await fetchJson<DataDragonChampionsResponse>(
    `${DDRAGON_BASE}/cdn/${version}/data/${locale}/champion.json`,
  );

  return Object.values(payload.data);
}

export function buildSplashUrl(championId: string): string {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_0.jpg`;
}

export function buildSquareUrl(championId: string, version: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championId}.png`;
}

interface SyncChampionsOptions {
  prisma: PrismaClient;
  version?: string;
  entries?: DataDragonChampionEntry[];
}

export async function syncChampionsToDatabase({
  prisma,
  version,
  entries,
}: SyncChampionsOptions): Promise<ChampionSyncResult> {
  const resolvedVersion = version ?? (await fetchLatestPatchVersion());
  const resolvedEntries = entries ?? (await fetchChampionsForVersion(resolvedVersion));

  if (resolvedEntries.length === 0) {
    throw new Error('Data Dragon returned no champions for this version.');
  }

  const existing = await prisma.champion.findMany({
    select: { id: true },
  });
  const existingIds = new Set(existing.map((c) => c.id));

  let inserted = 0;
  let updated = 0;

  for (const entry of resolvedEntries) {
    const data = {
      name: entry.name,
      title: entry.title,
      splashUrl: buildSplashUrl(entry.id),
      squareUrl: buildSquareUrl(entry.id, resolvedVersion),
      patchVersion: resolvedVersion,
    };

    await prisma.champion.upsert({
      where: { id: entry.id },
      create: { id: entry.id, ...data },
      update: data,
    });

    if (existingIds.has(entry.id)) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return {
    patchVersion: resolvedVersion,
    total: resolvedEntries.length,
    inserted,
    updated,
    disabledRemoved: 0,
  };
}
