/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transpile the shared package so Next can process its TypeScript directly.
  transpilePackages: ['@ai-job-apply/shared'],

  // Expose build-time env vars.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
