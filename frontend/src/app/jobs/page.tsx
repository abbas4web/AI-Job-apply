'use client';

import { Briefcase, Plus } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';

export default function JobsPage() {
  return (
    <DashboardShell
      title="Jobs"
      actions={
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
          Add job
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <Briefcase className="h-7 w-7 text-indigo-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No jobs yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Add jobs manually or run ingestion to pull listings from your
          configured sources automatically.
        </p>
        <Button className="mt-6" leftIcon={<Plus className="h-4 w-4" />}>
          Add your first job
        </Button>
      </div>
    </DashboardShell>
  );
}
