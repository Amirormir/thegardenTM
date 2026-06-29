import { UserRole } from '@nexus/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildRateLimitHeaders, checkRateLimit } from '@/lib/rate-limit';
import { createUploadTicket } from '@/lib/replay/ticket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_REPLAY_SERVICE_URL = 'http://127.0.0.1:8000';
const RATE_LIMIT_PER_HOUR = 12;

function log(...args: unknown[]) {
  console.log('[replay-ticket]', ...args);
}

/**
 * Delivre un ticket d'upload signe pour envoyer un .rofl directement au
 * microservice de replay (contourne la limite de 4,5 Mo de Vercel). Reserve aux
 * admins et rate-limite, exactement comme l'ancien proxy /parse.
 */
export async function POST() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    log('auth() threw', error);
    return NextResponse.json({ error: 'Auth check failed.' }, { status: 500 });
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { error: `Forbidden (role=${session.user.role}).` },
      { status: 403 },
    );
  }

  const rate = await checkRateLimit({
    identifier: session.user.id,
    scope: 'replays:ticket',
    limit: RATE_LIMIT_PER_HOUR,
    windowSeconds: 3600,
  });

  if (!rate.allowed) {
    log('rate-limited', { userId: session.user.id, resetAt: rate.resetAt });
    return NextResponse.json(
      { error: 'Too many replay uploads. Try again later.' },
      { status: 429, headers: buildRateLimitHeaders(rate) },
    );
  }

  const serviceUrl = (process.env.REPLAY_SERVICE_URL ?? DEFAULT_REPLAY_SERVICE_URL).replace(
    /\/$/,
    '',
  );
  const uploadUrl = `${serviceUrl}/replays`;

  // En dev local le service tourne sans secret : on renvoie un ticket vide.
  const secret = process.env.REPLAY_UPLOAD_SECRET;
  const ticket = secret ? createUploadTicket(secret) : { token: '', exp: 0 };

  log('ticket issued', { userId: session.user.id, uploadUrl, signed: Boolean(secret) });

  return NextResponse.json(
    { uploadUrl, token: ticket.token, exp: ticket.exp },
    { headers: buildRateLimitHeaders(rate) },
  );
}
