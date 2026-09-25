import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { API_PREFIX } from '@ai-job-apply/shared';
import { AppError } from './utils/AppError';
import { logger } from './utils/logger';
import apiRouter from './routes';

export function createApp(): Application {
  const app = express();

  // ── Security ────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // ── Rate limiting ───────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, slow down.' },
    })
  );

  // ── Body parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── HTTP logging ────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // ── API routes (/api/v1/...) ────────────────────────────────
  app.use(API_PREFIX, apiRouter);

  // ── 404 handler ─────────────────────────────────────────────
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound('Route not found'));
  });

  // ── Global error handler ────────────────────────────────────
  // Must have exactly 4 params so Express recognises it as error middleware.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
      });
      return;
    }

    // Unexpected error — log it, hide details in production
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error:
        env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
}
