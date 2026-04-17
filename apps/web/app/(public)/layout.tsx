import type { ReactNode } from 'react';
import { Navbar } from '@/components/layouts/navbar';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">{children}</main>
      <footer className="border-t border-white/[0.05] px-4 py-8 text-sm text-text-secondary md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span>Garden • League Manager</span>
          <span>Next.js 15 • tRPC 11 • Auth.js v5 • Prisma 6</span>
        </div>
      </footer>
    </div>
  );
}
