import { Request, Response } from 'express';
import { ingestionService } from '../ingestion/IngestionService';
import {
  getRegisteredSources,
  getEnabledSources,
  getAllCapabilities,
  getSource,
  hasSource,
} from '../ingestion/registry';
import type { AuthRequest } from '../middleware/auth';
import type { RunIngestionInput } from '../ingestion/ingestion.schemas';
import { sseService } from '../sse/SseService';
import { JobSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// POST /api/v1/ingestion/run
// Trigger an ingestion run for one or more sources.
// ─────────────────────────────────────────────────────────────
export async function runIngestion(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthRequest;
  const body = req.body as RunIngestionInput;

  // Default to every enabled source when the caller doesn't specify
  const sources = body.sources ?? getEnabledSources();

  const results = await ingestionService.runAll(
    userId,
    {
      query:    body.query,
      location: body.location,
      limit:    body.limit,
    },
    sources,
  );

  const totals = results.reduce(
    (acc, r) => {
      acc.fetched  += r.fetched;
      acc.created  += r.created;
      acc.skipped  += r.skipped;
      acc.failed   += r.failed;
      return acc;
    },
    { fetched: 0, created: 0, skipped: 0, failed: 0 },
  );

  // SSE: notify the user for each newly created job
  if (totals.created > 0) {
    sseService.emit(userId, 'job.found', {
      count:   totals.created,
      sources: results.filter((r) => r.created > 0).map((r) => r.source),
    });
  }

  res.status(200).json({
    success: true,
    summary: totals,
    results,
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/ingestion/sources
// Lists every registered source key (enabled and disabled).
// ─────────────────────────────────────────────────────────────
export async function listSources(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      all:     getRegisteredSources(),
      enabled: getEnabledSources(),
    },
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/ingestion/capabilities
// Returns the full SourceCapabilities descriptor for every
// registered source. Intended for the UI and the scheduler.
// ─────────────────────────────────────────────────────────────
export async function listCapabilities(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: getAllCapabilities(),
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/ingestion/health
// Runs healthCheck() on every registered source in parallel and
// returns an aggregated readiness report.
// ─────────────────────────────────────────────────────────────
export async function checkHealth(_req: Request, res: Response): Promise<void> {
  const sources = getRegisteredSources();

  const checks = await Promise.all(
    sources.map(async (key) => {
      const src    = getSource(key as JobSource);
      const result = await src.healthCheck();
      return { source: key, ...result };
    }),
  );

  const allOk = checks.every((c) => c.status === 'ok');

  res.status(allOk ? 200 : 207).json({
    success: allOk,
    data:    checks,
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/v1/ingestion/health/:source
// Runs healthCheck() for a single named source.
// ─────────────────────────────────────────────────────────────
export async function checkSourceHealth(req: Request, res: Response): Promise<void> {
  const { source } = req.params as { source: string };

  if (!hasSource(source as JobSource)) {
    res.status(404).json({
      success: false,
      error:   `No handler registered for source "${source}".`,
    });
    return;
  }

  const src    = getSource(source as JobSource);
  const result = await src.healthCheck();

  res.status(result.status === 'down' ? 503 : 200).json({
    success: result.status !== 'down',
    data:    { source, ...result },
  });
}
