import { SignJWT } from 'jose';

export type DraftRole =
  | 'BLUE_CAPTAIN'
  | 'RED_CAPTAIN'
  | 'SPECTATOR'
  | 'ADMIN'
  /** Local-only: lets a dev admin act for whichever side has the current turn. */
  | 'DEV_DUAL_CAPTAIN';

interface SignArgs {
  userId: string;
  draftId: string;
  role: DraftRole;
  teamId: string | null;
  name?: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.DRAFT_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing DRAFT_JWT_SECRET (or NEXTAUTH_SECRET fallback)');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Mint a short-lived JWT (5 min) for the realtime app to authorize a draft connection.
 * Issuer/audience must match apps/realtime/src/auth.ts.
 */
export async function signDraftToken({
  userId,
  draftId,
  role,
  teamId,
  name,
}: SignArgs): Promise<string> {
  const payload: Record<string, unknown> = { draftId, role, teamId };
  if (name) payload.name = name;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('nexus-web')
    .setAudience('nexus-realtime')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getSecret());
}
