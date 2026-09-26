'use client';

import { Send } from 'lucide-react';
import { DashboardShell } from '@/components/layout';

export default function ApplicationsPage() {
  return (
    <DashboardShell title="Applications">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <Send className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No applications yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          When you apply to jobs, your applications and their status will
          appear here. Track everything from saved to offer.
        </p>
      </div>
    </DashboardShell>
  );
}
