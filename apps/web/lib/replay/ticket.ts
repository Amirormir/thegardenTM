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

function sign(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('base64url');
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
