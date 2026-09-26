'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function DashboardShell({ children, title, actions }: DashboardShellProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="min-w-0">
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <NotificationCenter />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
