'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from './Sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  /** Page title shown in the top header bar */
  title?: string;
  /** Optional content rendered to the right of the title (e.g. action buttons) */
  actions?: React.ReactNode;
}

export function DashboardShell({ children, title, actions }: DashboardShellProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        {(title || actions) && (
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
            {title && (
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
