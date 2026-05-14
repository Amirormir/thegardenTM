import { PrismaAdapter } from '@auth/prisma-adapter';
import { UserRole } from '@nexus/db';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import Credentials from 'next-auth/providers/credentials';
import Discord from 'next-auth/providers/discord';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function getAccessData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      captainOfTeamId: true,
    },
  });

  return {
    id: user?.id ?? userId,
    name: user?.name ?? null,
    image: user?.image ?? null,
    role: user?.role ?? UserRole.USER,
    teamId: user?.captainOfTeamId ?? null,
  };
}

function resolveUserRole(value: unknown): UserRole {
  if (typeof value === 'string' && Object.values(UserRole).includes(value as UserRole)) {
    return value as UserRole;
  }

  return UserRole.USER;
}

function resolveTeamId(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NEXTAUTH_SECRET
    ? {
        secret: process.env.NEXTAUTH_SECRET,
      }
    : {}),
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            role: true,
            captainOfTeamId: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          teamId: user.captainOfTeamId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      const ACCESS_REFRESH_MS = 5 * 60 * 1000;
      const now = Date.now();

      if (user?.id) {
        const accessData = await getAccessData(user.id);
        token.sub = accessData.id;
        token.name = accessData.name;
        token.picture = accessData.image;
        token.role = accessData.role;
        token.teamId = accessData.teamId;
        token.accessRefreshedAt = now;
        return token;
      }

      if (token?.sub) {
        const lastRefresh =
          typeof token.accessRefreshedAt === 'number' ? token.accessRefreshedAt : 0;
        const isStale = now - lastRefresh > ACCESS_REFRESH_MS;

        if (trigger === 'update' || isStale) {
          const accessData = await getAccessData(token.sub);
          token.sub = accessData.id;
          token.name = accessData.name;
          token.picture = accessData.image;
          token.role = accessData.role;
          token.teamId = accessData.teamId;
          token.accessRefreshedAt = now;
          return token;
        }

        token.role = resolveUserRole(token.role);
        token.teamId = resolveTeamId(token.teamId);
        return token;
      }

      token.role = resolveUserRole(token.role);
      token.teamId = resolveTeamId(token.teamId);
      return token;
    },
    session: ({ session, token }) => {
      if (!token?.sub) {
        return session;
      }

      session.user = {
        ...session.user,
        id: token.sub,
        name: typeof token.name === 'string' ? token.name : (session.user.name ?? null),
        image: typeof token.picture === 'string' ? token.picture : null,
        role: resolveUserRole(token.role),
        teamId: resolveTeamId(token.teamId),
      };
      return session;
    },
  },
});
