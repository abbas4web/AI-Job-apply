import express, { Application, Request, Response, NextResponse } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { API_PREFIX } from '@ai-job-apply/shared';

// Route imports (add as features are implemented)
// import authRoutes from './routes/auth';
// import jobRoutes from './routes/jobs';
// import applicationRoutes from './routes/applications';
// import resumeRoutes from './routes/resumes';

export function createApp(): Application {
  const app = express();

  // ── Security middleware ─────────────────────────────────────
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
    })
  );

  // ── Body parsing ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ─────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // ── Health check ────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ──────────────────────────────────────────────
  // app.use(`${API_PREFIX}/auth`, authRoutes);
  // app.use(`${API_PREFIX}/jobs`, jobRoutes);
  // app.use(`${API_PREFIX}/applications`, applicationRoutes);
  // app.use(`${API_PREFIX}/resumes`, resumeRoutes);

  // ── 404 handler ─────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ── Global error handler ────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextResponse) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error:
        env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
}
