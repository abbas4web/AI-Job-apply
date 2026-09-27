import type { JobSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// SourceErrorCode — machine-readable reason codes.
//
// IngestionService catches SourceError and uses the code to decide
// whether to retry, skip, or hard-fail the run.
// ─────────────────────────────────────────────────────────────
export type SourceErrorCode =
  /** Required env vars / API keys are missing or malformed */
  | 'CONFIG_INVALID'
  /** The source endpoint returned a non-2xx HTTP status */
  | 'HTTP_ERROR'
  /** The source responded but the payload couldn't be parsed */
  | 'PARSE_ERROR'
  /** The request was rejected due to rate limiting (429 / backoff) */
  | 'RATE_LIMITED'
  /** Network-level failure (DNS, timeout, connection refused) */
  | 'NETWORK_ERROR'
  /** Source explicitly signals that auth credentials are invalid */
  | 'AUTH_FAILED'
  /** The response was structurally valid but contained no usable jobs */
  | 'EMPTY_RESPONSE'
  /** Any other source-specific error not covered above */
  | 'UNKNOWN';

// ─────────────────────────────────────────────────────────────
// SourceError — typed error thrown by IJobSource implementations.
//
// Throwing SourceError (instead of a plain Error) lets
// IngestionService inspect the `code` field to produce better
// ScrapingLog entries and decide on retry behaviour.
//
// Usage inside a source:
//
//   throw new SourceError(
//     'RATE_LIMITED',
//     JobSource.LINKEDIN,
//     'Too many requests — back off for 60 s',
//     { retryAfterMs: 60_000 },
//   );
// ─────────────────────────────────────────────────────────────
export class SourceError extends Error {
  /** Machine-readable reason code */
  readonly code: SourceErrorCode;

  /** Which source emitted this error */
  readonly source: JobSource;

  /**
   * Optional structured context — HTTP status, retry-after, raw response
   * snippet, etc. Stored as `unknown` so callers must narrow before use.
   */
  readonly context?: unknown;

  /** True when the caller should consider retrying after a delay */
  readonly isRetryable: boolean;

  constructor(
    code: SourceErrorCode,
    source: JobSource,
    message: string,
    context?: unknown,
  ) {
    super(message);
    this.name    = 'SourceError';
    this.code    = code;
    this.source  = source;
    this.context = context;

    // These codes are worth retrying with exponential back-off
    this.isRetryable = code === 'RATE_LIMITED' || code === 'NETWORK_ERROR';

    // Maintain a clean stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SourceError);
    }
  }

  /** Serialise to a plain object suitable for JSON logging */
  toJSON(): Record<string, unknown> {
    return {
      name:        this.name,
      code:        this.code,
      source:      this.source,
      message:     this.message,
      isRetryable: this.isRetryable,
      context:     this.context,
    };
  }
}

/** Type-guard — true when `err` is a SourceError */
export function isSourceError(err: unknown): err is SourceError {
  return err instanceof SourceError;
}
