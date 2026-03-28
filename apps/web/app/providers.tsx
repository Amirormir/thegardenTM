'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { CommandPalette } from '@/components/ui/command-palette';
import { TRPCProvider } from '@/lib/trpc/provider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <TRPCProvider>
        {children}
        <CommandPalette />
      </TRPCProvider>
    </SessionProvider>
  );
}
