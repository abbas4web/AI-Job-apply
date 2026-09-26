import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | AI Job Apply',
    default: 'AI Job Apply',
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            AI Job Apply
          </span>
        </div>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-black/5">
          {children}
        </div>
      </div>
    </div>
  );
}
