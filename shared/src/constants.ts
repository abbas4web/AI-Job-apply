// ─────────────────────────────────────────────────────────────
// Shared Constants
// ─────────────────────────────────────────────────────────────

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const QUEUE_NAMES = {
  AI_TASKS: 'ai-tasks',
  SCRAPING: 'scraping',
  APPLICATIONS: 'applications',
} as const;

export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const;
