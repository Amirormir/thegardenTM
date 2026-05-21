'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SessionProvider } from 'next-auth/react';
import { TRPCProvider } from '@/lib/trpc/provider';

interface AppProvidersProps {
  children: ReactNode;
}

const CommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then((module) => module.CommandPalette),
  { ssr: false },
);

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
