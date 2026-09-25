// ─────────────────────────────────────────────────────────────
// AppError — structured operational error with HTTP status code
// ─────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}
