import { vi } from 'vitest';

// Mock next-auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock prisma — individual tests will configure the mock
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));
