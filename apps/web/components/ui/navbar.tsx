import { auth } from '@/lib/auth';
import { getServerCaller } from '@/server/caller';
import { NavbarClient } from './navbar-client';

export async function Navbar() {
  const [session, caller] = await Promise.all([auth(), getServerCaller()]);

  const season = await caller.league.getCurrentSeason().catch(() => null);
  const seasonLabel = season?.name ?? null;

  return (
    <NavbarClient
      user={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              image: session.user.image ?? null,
              role: String(session.user.role),
              teamId: session.user.teamId,
            }
          : null
      }
      seasonLabel={seasonLabel}
    />
  );
}
