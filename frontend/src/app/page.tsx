import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4">
      <div className="text-center">
        {/* Logo mark */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-white"
            aria-hidden="true"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          AI Job Apply
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Automate your job search with the power of AI.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
