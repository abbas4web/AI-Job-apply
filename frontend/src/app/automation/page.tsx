'use client';

import { Settings } from 'lucide-react';
import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';

export default function AutomationPage() {
  return (
    <DashboardShell title="Automation Settings">
      <div className="mx-auto max-w-2xl">
        {/* Coming soon card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Settings className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Automation preferences</h2>
              <p className="text-sm text-gray-500">
                Control how AI Job Apply matches and applies on your behalf
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              { label: 'Minimum match score',  description: 'Only consider jobs above this threshold (0–100)',  value: '70' },
              { label: 'Auto-apply',           description: 'Allow the system to submit applications automatically', value: 'Off' },
              { label: 'Preferred job titles', description: 'Job titles you want to target',                    value: 'Not set' },
              { label: 'Preferred locations',  description: 'Locations or "Remote"',                           value: 'Not set' },
              { label: 'Excluded companies',   description: 'Companies to skip entirely',                      value: 'None' },
            ].map(({ label, description, value }) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <span className="ml-4 shrink-0 text-sm font-medium text-gray-700">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary">Save preferences</Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
