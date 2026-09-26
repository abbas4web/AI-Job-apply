import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  GetApplicationsQuery,
} from '../middleware/schemas/application.schemas';

// ── Shared select ─────────────────────────────────────────────
// Returns application with its job summary — enough for list + detail views.

const APPLICATION_SELECT = {
  id:         true,
  userId:     true,
  jobId:      true,
  resumeId:   true,
  status:     true,
  matchScore: true,
  notes:      true,
  appliedAt:  true,
  createdAt:  true,
  updatedAt:  true,
  job: {
    select: {
      id:       true,
      title:    true,
      company:  true,
      location: true,
      source:   true,
      salary:   true,
      postedAt: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export type ApplicationRow = Prisma.ApplicationGetPayload<{
  select: typeof APPLICATION_SELECT;
}>;

export interface PaginatedApplications {
  data:  ApplicationRow[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

// ─────────────────────────────────────────────────────────────
// ApplicationsService
// ─────────────────────────────────────────────────────────────

export class ApplicationsService {
  // ── Create ────────────────────────────────────────────────

  /**
   * Create a new application for the authenticated user.
   * Enforces one application per (userId, jobId) — returns 409 on duplicate.
   */
  async create(
    userId: string,
    dto: CreateApplicationInput,
  ): Promise<ApplicationRow> {
    // Guard: reject duplicate (userId, jobId)
    const existing = await prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId: dto.jobId } },
      select: { id: true },
    });

    if (existing) {
      throw AppError.conflict(
        `You already have an application for this job (id: ${existing.id}).`,
      );
    }

    // Verify the job exists
    const job = await prisma.job.findUnique({
      where:  { id: dto.jobId },
      select: { id: true },
    });
    if (!job) throw AppError.notFound('Job not found');

    // Verify resume ownership if supplied
    if (dto.resumeId) {
      const resume = await prisma.resume.findFirst({
        where:  { id: dto.resumeId, userId },
        select: { id: true },
      });
      if (!resume) throw AppError.notFound('Resume not found');
    }

    const application = await prisma.application.create({
      data: {
        userId,
        jobId:      dto.jobId,
        resumeId:   dto.resumeId   ?? null,
        status:     dto.status     ?? 'SAVED',
        matchScore: dto.matchScore ?? null,
        notes:      dto.notes      ?? null,
        appliedAt:  dto.appliedAt  ?? null,
      },
      select: APPLICATION_SELECT,
    });

    logger.info(
      `[applications] created — id=${application.id} ` +
      `userId=${userId} jobId=${dto.jobId} status=${application.status}`,
    );

    return application;
  }

  // ── List ──────────────────────────────────────────────────

  async findAll(
    userId: string,
    query:  GetApplicationsQuery,
  ): Promise<PaginatedApplications> {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {
      userId,
      ...(status !== undefined && { status }),
    };

    const [total, data] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        select:  APPLICATION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
      }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Get single ────────────────────────────────────────────

  async findById(id: string, userId: string): Promise<ApplicationRow> {
    const application = await prisma.application.findFirst({
      where:  { id, userId },
      select: APPLICATION_SELECT,
    });

    if (!application) throw AppError.notFound('Application not found');
    return application;
  }

  // ── Update ────────────────────────────────────────────────

  async update(
    id:     string,
    userId: string,
    dto:    UpdateApplicationInput,
  ): Promise<ApplicationRow> {
    // Enforce ownership
    await this.assertOwnership(id, userId);

    // When status is flipped to APPLIED and appliedAt is not explicitly
    // set, stamp it automatically.
    const appliedAt =
      dto.appliedAt !== undefined
        ? dto.appliedAt
        : dto.status === 'APPLIED'
          ? new Date()
          : undefined;

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(dto.status     !== undefined && { status:     dto.status }),
        ...(dto.notes      !== undefined && { notes:      dto.notes }),
        ...(dto.matchScore !== undefined && { matchScore: dto.matchScore }),
        ...(appliedAt      !== undefined && { appliedAt }),
      },
      select: APPLICATION_SELECT,
    });

    logger.info(
      `[applications] updated — id=${id} userId=${userId} status=${application.status}`,
    );

    return application;
  }

  // ── Delete ────────────────────────────────────────────────

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwnership(id, userId);
    await prisma.application.delete({ where: { id } });
    logger.info(`[applications] deleted — id=${id} userId=${userId}`);
  }

  // ── Private helpers ───────────────────────────────────────

  private async assertOwnership(id: string, userId: string) {
    const application = await prisma.application.findFirst({
      where:  { id, userId },
      select: { id: true },
    });
    if (!application) throw AppError.notFound('Application not found');
    return application;
  }
}

export const applicationsService = new ApplicationsService();
