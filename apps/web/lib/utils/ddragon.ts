const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

let cachedVersion: string | null = null;
let cachedChampions: ChampionEntry[] | null = null;

export interface ChampionEntry {
  id: string;
  name: string;
  key: string;
}

async function getLatestVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;

  const response = await fetch(`${DDRAGON_BASE}/api/versions.json`, {
    next: { revalidate: 86400 },
  });
  const versions = (await response.json()) as string[];
  cachedVersion = versions[0]!;
  return cachedVersion;
}

export async function getChampionList(): Promise<ChampionEntry[]> {
  if (cachedChampions) return cachedChampions;

  const version = await getLatestVersion();
  const response = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`,
    { next: { revalidate: 86400 } },
  );
  const json = (await response.json()) as { data: Record<string, { id: string; name: string; key: string }> };
  const data = json.data;

  cachedChampions = Object.values(data)
    .map((champion) => ({
      id: champion.id,
      name: champion.name,
      key: champion.key,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedChampions;
}

export function getChampionIconUrl(championId: string, version?: string): string {
  const v = version ?? '15.6.1';
  return `${DDRAGON_BASE}/cdn/${v}/img/champion/${championId}.png`;
}

/**
 * Data Dragon splash art (versionless). 1215×717 horizontal. Used for the
 * tournament-style pick slot tiles.
 */
export function getChampionSplashUrl(championId: string): string {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_0.jpg`;
}

export function getItemIconUrl(itemId: number, version?: string): string | null {
  if (!itemId) return null;
  const v = version ?? '15.6.1';
  return `${DDRAGON_BASE}/cdn/${v}/img/item/${itemId}.png`;
}

export function normalizeChampionId(input: string): string | null {
  const normalized = input.replace(/[^a-zA-Z]/g, '').toLowerCase();
  return normalized || null;
}
