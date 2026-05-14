import { UserRole } from '@nexus/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildRateLimitHeaders, checkRateLimit } from '@/lib/rate-limit';
import { parsedReplaySchema } from '@/lib/validators/replay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_REPLAY_SERVICE_URL = 'http://127.0.0.1:8000';
const UPSTREAM_TIMEOUT_MS = 20_000;
const RATE_LIMIT_PER_HOUR = 12;

function log(...args: unknown[]) {
  console.log('[replay-parse]', ...args);
}

export async function GET() {
  log('GET probe hit');
  return NextResponse.json({
    ok: true,
    route: '/api/admin/replays/parse',
    replayServiceUrl: process.env.REPLAY_SERVICE_URL ?? DEFAULT_REPLAY_SERVICE_URL,
    note: 'POST a multipart "file" (.rofl) to this endpoint.',
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  log('POST received', {
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
  });

  let session;
  try {
    session = await auth();
  } catch (error) {
    log('auth() threw', error);
    return NextResponse.json({ error: 'Auth check failed.' }, { status: 500 });
  }

  log('session resolved', {
    hasUser: Boolean(session?.user),
    role: session?.user?.role ?? null,
  });

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
    scope: 'replays:parse',
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    log('formData() threw', error);
    return NextResponse.json({ error: 'Invalid multipart payload.' }, { status: 400 });
  }

  const file = form.get('file');
  log('file field', {
    isFile: file instanceof File,
    name: file instanceof File ? file.name : null,
    size: file instanceof File ? file.size : null,
    type: file instanceof File ? file.type : null,
  });

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field.' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.rofl')) {
    return NextResponse.json({ error: 'Expected a .rofl file.' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.` },
      { status: 413 },
    );
  }

  const serviceUrl = (process.env.REPLAY_SERVICE_URL ?? DEFAULT_REPLAY_SERVICE_URL).replace(
    /\/$/,
    '',
  );
  const upstreamUrl = `${serviceUrl}/replays`;
  log('proxying to upstream', upstreamUrl);

  const upstreamForm = new FormData();
  upstreamForm.append('file', file, file.name);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      body: upstreamForm,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    log('upstream fetch threw', error);
    return NextResponse.json(
      {
        error: 'Replay service unreachable. Lance `lol-stats serve` côté Python.',
        upstreamUrl,
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  log('upstream responded', { status: upstream.status, ok: upstream.ok });

  const upstreamJson = (await upstream.json().catch(() => null)) as unknown;

  if (!upstream.ok) {
    log('upstream non-ok body', upstreamJson);
    const detail =
      (upstreamJson &&
        typeof upstreamJson === 'object' &&
        'detail' in upstreamJson &&
        typeof (upstreamJson as { detail: unknown }).detail === 'string' &&
        (upstreamJson as { detail: string }).detail) ||
      `Replay service returned ${upstream.status}.`;
    return NextResponse.json({ error: detail }, { status: upstream.status });
  }

  const parsed = parsedReplaySchema.safeParse(upstreamJson);
  if (!parsed.success) {
    log('zod validation failed', parsed.error.issues.slice(0, 5));
    return NextResponse.json(
      {
        error: 'Replay service returned an unexpected payload.',
        issues: parsed.error.issues.slice(0, 5),
      },
      { status: 502 },
    );
  }

  log('success', { elapsedMs: Date.now() - startedAt });
  return NextResponse.json(parsed.data, { headers: buildRateLimitHeaders(rate) });
}
