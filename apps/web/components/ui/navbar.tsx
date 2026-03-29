import { auth } from '@/lib/auth';
import { NavbarClient } from './navbar-client';

export async function Navbar() {
  const session = await auth();

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
    />
  );
}
