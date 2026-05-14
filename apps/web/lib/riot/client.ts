import axios, { type AxiosError } from 'axios';
import { Redis } from '@upstash/redis';

export type RiotErrorCode = 'RATE_LIMITED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN';

const RIOT_API_KEY_REDIS_KEY = 'riot:apikey:override';
const API_KEY_CACHE_TTL_MS = 60_000;

let overrideRedis: Redis | null | undefined;
let cachedOverride: { value: string | null; expiresAt: number } | null = null;

function getOverrideRedis() {
  if (overrideRedis !== undefined) return overrideRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  overrideRedis = url && token ? new Redis({ url, token }) : null;
  return overrideRedis;
}

async function readApiKeyOverride() {
  if (cachedOverride && cachedOverride.expiresAt > Date.now()) {
    return cachedOverride.value;
  }

  const client = getOverrideRedis();
  if (!client) {
    cachedOverride = { value: null, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS };
    return null;
  }

  try {
    const value = await client.get<string>(RIOT_API_KEY_REDIS_KEY);
    cachedOverride = {
      value: typeof value === 'string' && value.length > 0 ? value : null,
      expiresAt: Date.now() + API_KEY_CACHE_TTL_MS,
    };
    return cachedOverride.value;
  } catch {
    cachedOverride = { value: null, expiresAt: Date.now() + API_KEY_CACHE_TTL_MS };
    return null;
  }
}

export async function resolveRiotApiKey() {
  const override = await readApiKeyOverride();
  return override ?? process.env.RIOT_API_KEY ?? null;
}

export class RiotApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: RiotErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

const RIOT_REGIONAL_BASE_URL = 'https://europe.api.riotgames.com';
const RIOT_PLATFORM_BASE_URL = 'https://euw1.api.riotgames.com';

function mapAxiosError(error: AxiosError) {
  const status = error.response?.status ?? 500;

  if (status === 429) {
    return new RiotApiError(status, 'RATE_LIMITED', 'Riot API rate limit exceeded.');
  }

  if (status === 403) {
    return new RiotApiError(
      status,
      'FORBIDDEN',
      'Riot API access forbidden. The dev key is likely missing or expired.',
    );
  }

  if (status === 404) {
    return new RiotApiError(status, 'NOT_FOUND', 'Requested Riot resource was not found.');
  }

  if (status >= 500) {
    return new RiotApiError(status, 'SERVER_ERROR', 'Riot API is currently unavailable.');
  }

  return new RiotApiError(status, 'UNKNOWN', error.message);
}

function createRiotAxiosClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    timeout: 12000,
  });

  client.interceptors.request.use(async (config) => {
    const apiKey = await resolveRiotApiKey();

    if (!apiKey) {
      throw new RiotApiError(
        403,
        'FORBIDDEN',
        'RIOT_API_KEY is not configured or the development key has expired.',
      );
    }

    config.headers.set('X-Riot-Token', apiKey);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error)) {
        return Promise.reject(mapAxiosError(error));
      }

      return Promise.reject(
        new RiotApiError(500, 'UNKNOWN', 'Unexpected Riot API transport error.'),
      );
    },
  );

  return client;
}

export const regionalRiotClient = createRiotAxiosClient(RIOT_REGIONAL_BASE_URL);
export const platformRiotClient = createRiotAxiosClient(RIOT_PLATFORM_BASE_URL);
