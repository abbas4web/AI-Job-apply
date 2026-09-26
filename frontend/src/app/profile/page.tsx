'use client';

import { User } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <DashboardShell title="Profile">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
              {user?.name?.charAt(0).toUpperCase() ?? <User className="h-8 w-8" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="mt-8 space-y-5">
            {[
              { label: 'Full name', value: user?.name ?? '', placeholder: 'Your name' },
              { label: 'Email',     value: user?.email ?? '', placeholder: 'your@email.com' },
            ].map(({ label, value, placeholder }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <input
                  defaultValue={value}
                  placeholder={placeholder}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" disabled>
              Save changes
            </Button>
          </div>

          <p className="mt-3 text-right text-xs text-gray-400">
            Profile editing coming soon
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
