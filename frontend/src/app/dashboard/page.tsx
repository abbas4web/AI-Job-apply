'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';
import {
  Briefcase,
  FileText,
  Zap,
  TrendingUp,
  LogOut,
  User,
} from 'lucide-react';

const stats = [
  { label: 'Jobs tracked',     value: '0', icon: Briefcase,  color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Applications',     value: '0', icon: FileText,   color: 'bg-emerald-50 text-emerald-600' },
  { label: 'AI matches',       value: '0', icon: Zap,        color: 'bg-amber-50 text-amber-600' },
  { label: 'Interview rate',   value: '—', icon: TrendingUp, color: 'bg-rose-50 text-rose-600' },
];

export default function DashboardPage() {
  const router   = useRouter();
  const { user, token, logout, isLoading } = useAuthStore();

  // Guard — redirect to login if not authenticated
  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white"
                aria-hidden="true"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">AI Job Apply</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="font-medium">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              isLoading={isLoading}
              onClick={handleLogout}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of your job search activity.
          </p>
        </div>

        {/* Stats grid */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className={`mb-3 inline-flex rounded-lg p-2 ${color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-0.5 text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <Briefcase className="h-7 w-7 text-indigo-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            No jobs yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Start by adding jobs you&apos;re interested in. AI Job Apply will
            match your resume and track your applications automatically.
          </p>
          <Button className="mt-6" leftIcon={<Zap className="h-4 w-4" />}>
            Add your first job
          </Button>
        </div>
      </main>
    </div>
  );
}
