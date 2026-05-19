function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const env = {
  port: Number.parseInt(optional('PORT', '4000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  /** Same secret as apps/web NEXTAUTH_SECRET — used to verify draft tokens. */
  draftJwtSecret: required('DRAFT_JWT_SECRET'),
  /** Shared secret used by apps/web to call internal control endpoints. */
  internalSecret: required('INTERNAL_API_SECRET'),
  /** Standard redis URL (`rediss://default:TOKEN@HOST:PORT`). Upstash supports this in addition to REST. */
  redisUrl: required('REDIS_URL'),
  /** CORS origin allowed to connect (e.g. https://thegarden.example). */
  webOrigin: required('WEB_ORIGIN'),
  /** Postgres connection string (same as apps/web DATABASE_URL). */
  databaseUrl: required('DATABASE_URL'),
};

export type Env = typeof env;
