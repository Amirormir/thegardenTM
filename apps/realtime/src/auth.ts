import { jwtVerify } from 'jose';
import { env } from './env.js';

const secretBytes = new TextEncoder().encode(env.draftJwtSecret);

export type DraftRole =
  | 'BLUE_CAPTAIN'
  | 'RED_CAPTAIN'
  | 'SPECTATOR'
  | 'ADMIN'
  /** Local-only: dev admin can act for whichever side currently has the turn. */
  | 'DEV_DUAL_CAPTAIN';

export interface DraftTokenClaims {
  /** Subject — user id from auth.js session. */
  sub: string;
  /** Draft id this token grants access to. */
  draftId: string;
  /** Role granted in the draft room. */
  role: DraftRole;
  /** Team id used to resolve blue/red after a coin flip swap. */
  teamId: string | null;
  /** Optional display name (not authoritative). */
  name?: string;
}

const ROLES: readonly DraftRole[] = [
  'BLUE_CAPTAIN',
  'RED_CAPTAIN',
  'SPECTATOR',
  'ADMIN',
  'DEV_DUAL_CAPTAIN',
];

export async function verifyDraftToken(token: string): Promise<DraftTokenClaims> {
  const { payload } = await jwtVerify(token, secretBytes, {
    issuer: 'nexus-web',
    audience: 'nexus-realtime',
  });

  const sub = typeof payload.sub === 'string' ? payload.sub : null;
  const draftId = typeof payload.draftId === 'string' ? payload.draftId : null;
  const role = typeof payload.role === 'string' ? payload.role : null;
  const teamId =
    typeof payload.teamId === 'string' ? payload.teamId : payload.teamId === null ? null : null;

  if (!sub || !draftId || !role) {
    throw new Error('Invalid draft token payload');
  }
  if (!ROLES.includes(role as DraftRole)) {
    throw new Error('Invalid draft token role');
  }

  return {
    sub,
    draftId,
    role: role as DraftRole,
    teamId,
    ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
  };
}
