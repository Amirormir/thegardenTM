import type { ReactNode } from 'react';
import { Navbar } from '@/components/layouts/navbar';
import { GardenLogo } from '@/components/ui/garden-logo';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-6 py-10 md:px-10 md:py-14">{children}</main>
      <footer className="hairline-t px-6 py-10 text-sm text-foreground-dim md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="inline-flex items-center gap-3">
            <GardenLogo showLabel={false} imageClassName="h-8 w-8" />
            <span className="label-mono">Garden · Magazine editorial</span>
          </span>
          <span className="label-mono">Next.js 15 · tRPC 11 · Auth.js v5 · Prisma 6</span>
        </div>
      </footer>
    </div>
  );
}
