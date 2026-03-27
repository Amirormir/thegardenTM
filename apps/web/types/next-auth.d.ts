import type { UserRole } from '@nexus/db';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: UserRole;
      teamId: string | null;
    };
  }

  interface User {
    role?: UserRole;
    teamId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
    teamId?: string | null;
  }
}
