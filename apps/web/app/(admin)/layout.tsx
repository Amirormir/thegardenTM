import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 py-10 md:px-8 lg:py-12">{children}</main>
    </div>
  );
}
