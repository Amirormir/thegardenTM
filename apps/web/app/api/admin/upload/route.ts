import { UserRole } from '@nexus/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { uploadRemoteUrlToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import { buildRateLimitHeaders, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = 60;
const ALLOWED_FOLDERS = new Set(['players', 'teams', 'articles']);
const DEFAULT_FOLDER = 'misc';

const ACCEPTED_MIME = /^image\/(png|jpe?g|gif|webp|avif|svg\+xml)$/i;

const remoteSchema = z.object({
  sourceUrl: z.string().url().max(2048),
  folder: z.string().optional(),
});

function folderFor(input: string | null | undefined) {
  if (input && ALLOWED_FOLDERS.has(input)) {
    return `nexus-league/${input}`;
  }
  return `nexus-league/${DEFAULT_FOLDER}`;
}

export async function POST(request: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: 'Auth check failed.' }, { status: 500 });
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const rate = await checkRateLimit({
    identifier: session.user.id,
    scope: 'cloudinary:upload',
    limit: RATE_LIMIT_PER_HOUR,
    windowSeconds: 3600,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Trop d\u2019uploads. Réessaye dans quelques minutes.' },
      { status: 429, headers: buildRateLimitHeaders(rate) },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const folderField = form.get('folder');
      const folder = typeof folderField === 'string' ? folderField : null;

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Champ « file » manquant.' }, { status: 400 });
      }

      if (file.size === 0) {
        return NextResponse.json({ error: 'Fichier vide.' }, { status: 400 });
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Fichier trop volumineux (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` },
          { status: 413 },
        );
      }

      if (file.type && !ACCEPTED_MIME.test(file.type)) {
        return NextResponse.json(
          { error: `Format non supporté (${file.type}). Utilise PNG, JPG, WEBP, GIF, AVIF ou SVG.` },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadToCloudinary({ data: buffer, folder: folderFor(folder) });
      return NextResponse.json(result, { headers: buildRateLimitHeaders(rate) });
    }

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as unknown;
      const parsed = remoteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Payload JSON invalide. Attendu { sourceUrl: string, folder?: string }.' },
          { status: 400 },
        );
      }

      const result = await uploadRemoteUrlToCloudinary(parsed.data.sourceUrl, {
        folder: folderFor(parsed.data.folder ?? null),
        maxBytes: MAX_UPLOAD_BYTES,
      });
      return NextResponse.json(result, { headers: buildRateLimitHeaders(rate) });
    }

    return NextResponse.json(
      { error: 'Content-Type non supporté. Utilise multipart/form-data ou application/json.' },
      { status: 415 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload échoué.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
