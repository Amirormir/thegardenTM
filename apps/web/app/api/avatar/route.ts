import { NextResponse } from 'next/server';

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const revalidate = 86400;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing avatar url.' }, { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid avatar url.' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return NextResponse.json({ error: 'Unsupported protocol.' }, { status: 400 });
  }

  if (BLOCKED_HOSTS.has(targetUrl.hostname.toLowerCase())) {
    return NextResponse.json({ error: 'Blocked hostname.' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      cache: 'force-cache',
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to fetch avatar.' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Unsupported content type.' }, { status: 415 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch avatar.' }, { status: 502 });
  }
}
