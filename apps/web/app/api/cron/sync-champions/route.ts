import { NextResponse } from 'next/server';
import { prisma } from '@nexus/db';
import { syncChampionsToDatabase } from '@/lib/riot/data-dragon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get('secret') === secret) return true;

  return false;
}

async function runSync() {
  const result = await syncChampionsToDatabase({ prisma });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    return await runSync();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
