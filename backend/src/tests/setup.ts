/**
 * Global test setup — runs once before every test file.
 *
 * - Sets a minimal set of required env vars so the app can import
 *   without crashing on missing config.
 * - Does NOT connect to a real database or Redis.
 */

// Must come before any app imports that touch process.env
process.env.NODE_ENV        = 'test';
process.env.PORT            = '4001';
process.env.DATABASE_URL    = 'postgresql://test:test@localhost:5432/testdb';
process.env.DIRECT_URL      = 'postgresql://test:test@localhost:5432/testdb';
process.env.REDIS_HOST      = 'localhost';
process.env.REDIS_PORT      = '6379';
process.env.JWT_SECRET      = 'test-secret-that-is-long-enough-32ch';
process.env.JWT_EXPIRES_IN  = '1h';
process.env.GEMINI_API_KEY  = 'test-gemini-key';
process.env.CORS_ORIGIN     = 'http://localhost:3007';
