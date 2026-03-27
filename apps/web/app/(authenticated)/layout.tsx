import type { ReactNode } from 'react';
import { Navbar } from '@/components/layouts/navbar';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
