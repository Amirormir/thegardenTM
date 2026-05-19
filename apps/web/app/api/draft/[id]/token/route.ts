import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signDraftToken, type DraftRole } from '@/lib/draft-token';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id: draftId } = await ctx.params;

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    select: { id: true, blueTeamId: true, redTeamId: true },
  });
  if (!draft) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // Team ownership takes precedence over ADMIN role so an admin who captains
  // one of the two teams (e.g. the local test squad) gets BLUE/RED captaincy
  // instead of being treated as a spectating admin.
  //
  // Local-only escape hatch: in non-production, an ADMIN gets DEV_DUAL_CAPTAIN
  // so a single account can drive both sides of a draft for testing.
  let role: DraftRole;
  if (process.env.NODE_ENV !== 'production' && session.user.role === 'ADMIN') {
    role = 'DEV_DUAL_CAPTAIN';
  } else if (session.user.teamId === draft.blueTeamId) {
    role = 'BLUE_CAPTAIN';
  } else if (session.user.teamId === draft.redTeamId) {
    role = 'RED_CAPTAIN';
  } else if (session.user.role === 'ADMIN') {
    role = 'ADMIN';
  } else {
    role = 'SPECTATOR';
  }

  const token = await signDraftToken({
    userId: session.user.id,
    draftId,
    role,
    teamId: session.user.teamId ?? null,
    name: session.user.name ?? null,
  });

  return NextResponse.json({ token, role, teamId: session.user.teamId ?? null });
}
