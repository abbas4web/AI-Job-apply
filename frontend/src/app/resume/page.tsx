'use client';

import { FileText, Upload } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';

export default function ResumePage() {
  return (
    <DashboardShell title="Resume">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <FileText className="h-7 w-7 text-indigo-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No resume uploaded</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Upload your resume so AI Job Apply can match you against jobs and
          generate tailored cover letters.
        </p>
        <Button className="mt-6" leftIcon={<Upload className="h-4 w-4" />}>
          Upload resume
        </Button>
      </div>
    </DashboardShell>
  );
}
