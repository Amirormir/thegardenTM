import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#09080d] lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 py-8 md:px-8 lg:py-10">{children}</main>
    </div>
  );
}
