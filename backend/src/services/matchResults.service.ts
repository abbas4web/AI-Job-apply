import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { JobMatch } from './schemas/jobMatch.schema';

// ─────────────────────────────────────────────────────────────
// Shared select — consistent shape for all reads
// ─────────────────────────────────────────────────────────────

const MATCH_SELECT = {
  id:              true,
  userId:          true,
  jobId:           true,
  resumeId:        true,
  status:          true,
  matchScore:      true,
  matchedSkills:   true,
  missingSkills:   true,
  experienceMatch: true,
  locationMatch:   true,
  reason:          true,
  queueJobId:      true,
  errorMessage:    true,
  processedAt:     true,
  createdAt:       true,
  updatedAt:       true,
} satisfies Prisma.JobMatchResultSelect;

export type MatchResultRow = Prisma.JobMatchResultGetPayload<{
  select: typeof MATCH_SELECT;
}>;

// ─────────────────────────────────────────────────────────────
// MatchResultsService
//
// The unique(userId, jobId, resumeId) constraint makes every
// write an upsert — safe to call on BullMQ retries without
// creating duplicate rows.
// ─────────────────────────────────────────────────────────────

export class MatchResultsService {
  /**
   * markPending — create or reset a row to PENDING when a job
   * is first enqueued.  Called by the producer before the job
   * is added to the queue so there is always a DB record to
   * update, even if the worker crashes before it starts.
   */
  async markPending(
    userId:     string,
    jobId:      string,
    resumeId:   string,
    queueJobId: string,
  ): Promise<MatchResultRow> {
    const row = await prisma.jobMatchResult.upsert({
      where:  { userId_jobId_resumeId: { userId, jobId, resumeId } },
      create: {
        userId,
        jobId,
        resumeId,
        status:     'PENDING',
        queueJobId,
        matchedSkills: [],
        missingSkills: [],
      },
      update: {
        status:       'PENDING',
        queueJobId,
        errorMessage: null,
        processedAt:  null,
        // Clear any previous match data so stale results are not visible
        matchScore:      null,
        matchedSkills:   [],
        missingSkills:   [],
        experienceMatch: null,
        locationMatch:   null,
        reason:          null,
      },
      select: MATCH_SELECT,
    });

    logger.debug(
      `[match-results] markPending — userId=${userId} jobId=${jobId} resumeId=${resumeId}`,
    );

    return row;
  }

  /**
   * markProcessing — flip status to PROCESSING when the worker
   * picks the job up.  Idempotent: safe to call on every attempt.
   */
  async markProcessing(
    userId:   string,
    jobId:    string,
    resumeId: string,
  ): Promise<void> {
    await prisma.jobMatchResult.upsert({
      where:  { userId_jobId_resumeId: { userId, jobId, resumeId } },
      create: {
        userId,
        jobId,
        resumeId,
        status: 'PROCESSING',
        matchedSkills: [],
        missingSkills: [],
      },
      update: { status: 'PROCESSING' },
      select: { id: true },
    });
  }

  /**
   * saveResult — persist the Gemini match result and flip the
   * row to COMPLETED.  The upsert makes this safe on retries —
   * a second call simply overwrites the previous result.
   */
  async saveResult(
    userId:     string,
    jobId:      string,
    resumeId:   string,
    result:     JobMatch,
    queueJobId: string,
  ): Promise<MatchResultRow> {
    const now = new Date();

    const row = await prisma.jobMatchResult.upsert({
      where:  { userId_jobId_resumeId: { userId, jobId, resumeId } },
      create: {
        userId,
        jobId,
        resumeId,
        status:          'COMPLETED',
        matchScore:      result.matchScore,
        matchedSkills:   result.matchedSkills,
        missingSkills:   result.missingSkills,
        experienceMatch: result.experienceMatch,
        locationMatch:   result.locationMatch,
        reason:          result.reason,
        queueJobId,
        processedAt:     now,
      },
      update: {
        status:          'COMPLETED',
        matchScore:      result.matchScore,
        matchedSkills:   result.matchedSkills,
        missingSkills:   result.missingSkills,
        experienceMatch: result.experienceMatch,
        locationMatch:   result.locationMatch,
        reason:          result.reason,
        queueJobId,
        errorMessage:    null,
        processedAt:     now,
      },
      select: MATCH_SELECT,
    });

    logger.info(
      `[match-results] saved — userId=${userId} jobId=${jobId} ` +
      `score=${result.matchScore} resumeId=${resumeId}`,
    );

    return row;
  }

  /**
   * markFailed — called when all BullMQ retries are exhausted.
   * Records the error message so the failure is visible in the DB.
   */
  async markFailed(
    userId:       string,
    jobId:        string,
    resumeId:     string,
    errorMessage: string,
  ): Promise<void> {
    await prisma.jobMatchResult.upsert({
      where:  { userId_jobId_resumeId: { userId, jobId, resumeId } },
      create: {
        userId,
        jobId,
        resumeId,
        status:       'FAILED',
        errorMessage,
        matchedSkills: [],
        missingSkills: [],
      },
      update: {
        status:       'FAILED',
        errorMessage,
      },
      select: { id: true },
    });

    logger.warn(
      `[match-results] markFailed — userId=${userId} jobId=${jobId} ` +
      `resumeId=${resumeId} error=${errorMessage}`,
    );
  }

  // ── Queries ───────────────────────────────────────────────

  /** All match results for a user, most recently processed first. */
  async findByUser(userId: string): Promise<MatchResultRow[]> {
    return prisma.jobMatchResult.findMany({
      where:   { userId },
      select:  MATCH_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** All match results for a specific job across all users. */
  async findByJob(jobId: string): Promise<MatchResultRow[]> {
    return prisma.jobMatchResult.findMany({
      where:   { jobId },
      select:  MATCH_SELECT,
      orderBy: { matchScore: 'desc' },
    });
  }

  /** Single result for a (user, job, resume) triple — returns null if not found. */
  async findOne(
    userId:   string,
    jobId:    string,
    resumeId: string,
  ): Promise<MatchResultRow | null> {
    return prisma.jobMatchResult.findUnique({
      where:  { userId_jobId_resumeId: { userId, jobId, resumeId } },
      select: MATCH_SELECT,
    });
  }

  /** Fetch a single result by ID, enforce ownership. */
  async findById(id: string, userId: string): Promise<MatchResultRow> {
    const row = await prisma.jobMatchResult.findFirst({
      where:  { id, userId },
      select: MATCH_SELECT,
    });

    if (!row) throw AppError.notFound('Match result not found');
    return row;
  }
}

export const matchResultsService = new MatchResultsService();
