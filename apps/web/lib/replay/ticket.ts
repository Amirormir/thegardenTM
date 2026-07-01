import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Ticket d'upload signe (HMAC-SHA256) permettant au navigateur d'uploader un
 * .rofl directement vers le microservice Railway sans passer par Vercel (limite
 * de 4,5 Mo des fonctions serverless). Le secret reste cote serveur : le
 * navigateur ne recoit qu'un jeton de courte duree.
 *
 * Format du jeton : `${exp}.${base64url(hmac)}` ou exp est un timestamp UNIX
 * en secondes. Le microservice Python recalcule le HMAC et verifie l'expiration.
 */
const DEFAULT_TTL_SECONDS = 300; // 5 min
const DEFAULT_REPLAY_SERVICE_URL = 'http://127.0.0.1:8000';

export class ReplayUploadConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayUploadConfigError';
  }
}

function sign(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('base64url');
}

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(`http://${value}`).hostname.toLowerCase();
  } catch {
    return value.split(':')[0]?.toLowerCase() ?? null;
  }
}

function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.startsWith('127.')
  );
}

function appendReplayPath(serviceUrl: URL) {
  const uploadUrl = new URL(serviceUrl.toString());
  const basePath = uploadUrl.pathname.replace(/\/+$/, '');
  uploadUrl.pathname = basePath.endsWith('/replays') ? basePath : `${basePath}/replays`;
  uploadUrl.search = '';
  uploadUrl.hash = '';
  return uploadUrl.toString();
}

export function resolveReplayUploadTarget({
  serviceUrl,
  requestHost,
  isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
}: {
  serviceUrl: string | undefined;
  requestHost?: string | null;
  isProduction?: boolean;
}) {
  const rawServiceUrl = serviceUrl?.trim() || DEFAULT_REPLAY_SERVICE_URL;

  let parsed: URL;
  try {
    parsed = new URL(rawServiceUrl);
  } catch {
    throw new ReplayUploadConfigError('REPLAY_SERVICE_URL doit etre une URL absolue valide.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ReplayUploadConfigError('REPLAY_SERVICE_URL doit utiliser http ou https.');
  }

  const targetHost = parsed.hostname.toLowerCase();
  const appHost = normalizeHost(requestHost);

  if (isProduction) {
    if (!serviceUrl?.trim()) {
      throw new ReplayUploadConfigError('REPLAY_SERVICE_URL doit etre configure en production.');
    }

    if (isLoopbackHost(targetHost)) {
      throw new ReplayUploadConfigError(
        'REPLAY_SERVICE_URL pointe vers localhost en production. Utilise l URL publique du microservice replay.',
      );
    }

    if (appHost && targetHost === appHost) {
      throw new ReplayUploadConfigError(
        'REPLAY_SERVICE_URL pointe vers l application web. L upload .rofl doit viser le microservice replay, pas Vercel.',
      );
    }

    if (targetHost.endsWith('.vercel.app')) {
      throw new ReplayUploadConfigError(
        'REPLAY_SERVICE_URL pointe vers Vercel. Les .rofl depassent la limite de payload des Functions; utilise le service replay externe.',
      );
    }
  }

  return {
    serviceUrl: rawServiceUrl,
    uploadUrl: appendReplayPath(parsed),
  };
}

export function createUploadTicket(
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): { token: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = `${exp}.${sign(secret, String(exp))}`;
  return { token, exp };
}

/**
 * Verifie un jeton (utilise par les tests ; cote prod c'est le service Python
 * qui valide). Retourne true si la signature est valide et non expiree.
 */
export function verifyUploadTicket(secret: string, token: string): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0) {
    return false;
  }

  const expPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const exp = Number.parseInt(expPart, 10);

  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = sign(secret, expPart);
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
