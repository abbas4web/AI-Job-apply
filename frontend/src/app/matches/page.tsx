'use client';

import { Zap } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';

export default function MatchesPage() {
  return (
    <DashboardShell title="Matches">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <Zap className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No AI matches yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Upload your resume and add jobs to start getting AI-powered match
          scores and skill gap analysis.
        </p>
        <Button className="mt-6" leftIcon={<Zap className="h-4 w-4" />}>
          Run matching
        </Button>
      </div>
    </DashboardShell>
  );
}
