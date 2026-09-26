import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { enqueueMatchJob } from '../queues/producers/aiMatchingProducer';
import type { CreateJobInput, UpdateJobInput, GetJobsQuery } from '../middleware/schemas/job.schemas';

// ── Shared select — used for all list / single responses ──────

const JOB_SELECT = {
  id:          true,
  title:       true,
  company:     true,
  location:    true,
  description: true,
  skills:      true,
  source:      true,
  sourceUrl:   true,
  externalId:  true,
  salary:      true,
  isDuplicate: true,
  postedAt:    true,
  createdAt:   true,
  updatedAt:   true,
} satisfies Prisma.JobSelect;

// ── DTOs ──────────────────────────────────────────────────────

export type CreateJobDto = CreateJobInput;
export type UpdateJobDto = UpdateJobInput;
export type JobFilters  = GetJobsQuery;

export interface PaginatedJobs {
  data:  Prisma.JobGetPayload<{ select: typeof JOB_SELECT }>[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

// ── Service ───────────────────────────────────────────────────

export class JobsService {
  // ── Create ──────────────────────────────────────────────────
  async create(dto: CreateJobDto) {
    // Guard: if an externalId is supplied, reject already-known jobs
    if (dto.externalId) {
      const existing = await prisma.job.findUnique({
        where: {
          source_externalId: { source: dto.source, externalId: dto.externalId },
        },
        select: { id: true, isDuplicate: true },
      });

      if (existing) {
        // Mark the existing record as a duplicate and surface a 409
        if (!existing.isDuplicate) {
          await prisma.job.update({
            where: { id: existing.id },
            data:  { isDuplicate: true },
          });
          logger.warn(`Job marked as duplicate: ${existing.id}`);
        }

        throw AppError.conflict(
          `A job with externalId "${dto.externalId}" from source "${dto.source}" already exists (id: ${existing.id}).`
        );
      }
    }

    const job = await prisma.job.create({
      data: {
        title:       dto.title,
        company:     dto.company,
        location:    dto.location,
        description: dto.description,
        skills:      dto.skills ?? [],
        source:      dto.source,
        sourceUrl:   dto.sourceUrl,
        externalId:  dto.externalId ?? null,
        salary:      dto.salary    ?? null,
        postedAt:    dto.postedAt  ?? null,
      },
      select: JOB_SELECT,
    });

    logger.info(`Job created: ${job.id} — "${job.title}" at ${job.company}`);

    // ── Fan-out: enqueue a MATCH_JOB for every user who has
    //    an analysed default resume.
    //
    //    Done asynchronously — a failure here must never block
    //    the HTTP response that created the job.
    this.enqueueMatchJobsForAllUsers(job.id).catch((err: unknown) => {
      logger.error(
        `[jobs] Failed to enqueue match jobs for jobId=${job.id}:`,
        String(err),
      );
    });

    return job;
  }

  // ── List with filters + pagination ──────────────────────────
  async findAll(filters: JobFilters): Promise<PaginatedJobs> {
    const { page, limit, source, search, isDuplicate } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      ...(source      !== undefined && { source }),
      ...(isDuplicate !== undefined && { isDuplicate }),
      ...(search && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { company:     { contains: search, mode: 'insensitive' } },
          { location:    { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        select:  JOB_SELECT,
        orderBy: { postedAt: 'desc' },
        skip,
        take:    limit,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Get single ───────────────────────────────────────────────
  async findById(id: string) {
    const job = await prisma.job.findUnique({
      where:  { id },
      select: JOB_SELECT,
    });

    if (!job) {
      throw AppError.notFound('Job not found');
    }

    return job;
  }

  // ── Update ───────────────────────────────────────────────────
  async update(id: string, dto: UpdateJobDto) {
    // Ensure the job exists first
    await this.assertExists(id);

    // If caller is changing the externalId / source combo, check for conflicts
    if (dto.externalId !== undefined || dto.source !== undefined) {
      const current = await prisma.job.findUnique({
        where:  { id },
        select: { source: true, externalId: true },
      });

      const newSource     = dto.source     ?? current!.source;
      const newExternalId = dto.externalId ?? current!.externalId;

      if (newExternalId) {
        const conflict = await prisma.job.findUnique({
          where: {
            source_externalId: { source: newSource, externalId: newExternalId },
          },
          select: { id: true },
        });

        if (conflict && conflict.id !== id) {
          throw AppError.conflict(
            `Another job with externalId "${newExternalId}" from source "${newSource}" already exists.`
          );
        }
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title:       dto.title }),
        ...(dto.company     !== undefined && { company:     dto.company }),
        ...(dto.location    !== undefined && { location:    dto.location }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.skills      !== undefined && { skills:      dto.skills }),
        ...(dto.source      !== undefined && { source:      dto.source }),
        ...(dto.sourceUrl   !== undefined && { sourceUrl:   dto.sourceUrl }),
        ...(dto.externalId  !== undefined && { externalId:  dto.externalId }),
        ...(dto.salary      !== undefined && { salary:      dto.salary }),
        ...(dto.postedAt    !== undefined && { postedAt:    dto.postedAt }),
        ...(dto.isDuplicate !== undefined && { isDuplicate: dto.isDuplicate }),
      },
      select: JOB_SELECT,
    });

    logger.info(`Job updated: ${id}`);
    return job;
  }

  // ── Mark duplicate ───────────────────────────────────────────
  async markDuplicate(id: string, isDuplicate: boolean) {
    await this.assertExists(id);

    const job = await prisma.job.update({
      where:  { id },
      data:   { isDuplicate },
      select: JOB_SELECT,
    });

    logger.info(`Job ${id} isDuplicate set to ${isDuplicate}`);
    return job;
  }

  // ── Delete ───────────────────────────────────────────────────
  async delete(id: string) {
    await this.assertExists(id);
    await prisma.job.delete({ where: { id } });
    logger.info(`Job deleted: ${id}`);
  }

  // ── Private helpers ──────────────────────────────────────────
  private async assertExists(id: string) {
    const job = await prisma.job.findUnique({
      where:  { id },
      select: { id: true },
    });
    if (!job) throw AppError.notFound('Job not found');
    return job;
  }

  /**
   * enqueueMatchJobsForAllUsers — finds every user that has at least
   * one resume with an analysed profile, then enqueues a MATCH_JOB
   * for each one against the newly created job.
   *
   * Only the default (or most-recent) resume per user is targeted;
   * the worker resolves the exact resume at execution time so we
   * don't need to lock in a resumeId here.
   *
   * Runs fire-and-forget from create() — failures are logged, not thrown.
   */
  private async enqueueMatchJobsForAllUsers(jobId: string): Promise<void> {
    // Find distinct userIds that have at least one analysed resume
    const usersWithProfiles = await prisma.resumeProfile.findMany({
      select: { resume: { select: { userId: true } } },
      distinct: ['resumeId'],
    });

    // Deduplicate userIds (a user could have multiple analysed resumes)
    const userIds = [
      ...new Set(usersWithProfiles.map((r) => r.resume.userId)),
    ];

    if (userIds.length === 0) {
      logger.debug(`[jobs] No users with analysed resumes — skipping match fan-out for jobId=${jobId}`);
      return;
    }

    logger.info(
      `[jobs] Enqueueing MATCH_JOB for ${userIds.length} user(s) — jobId=${jobId}`,
    );

    // Enqueue in parallel; individual failures are logged but don't
    // abort the rest of the fan-out.
    await Promise.allSettled(
      userIds.map((userId) =>
        enqueueMatchJob({ userId, jobId }).catch((err: unknown) => {
          logger.error(
            `[jobs] enqueueMatchJob failed — userId=${userId} jobId=${jobId}:`,
            String(err),
          );
        }),
      ),
    );
  }
}

export const jobsService = new JobsService();
