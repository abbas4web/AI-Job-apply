// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { geminiService } from './gemini.service';

export interface CreateResumeDto {
  name: string;
  isDefault?: boolean;
  fileBuffer: Buffer;
  originalFilename: string;
}

export interface UpdateResumeDto {
  name?: string;
  isDefault?: boolean;
}

export class ResumesService {
  // ── Upload & create ───────────────────────────────────────
  async create(userId: string, dto: CreateResumeDto) {
    // Extract text from the PDF buffer
    const extractedText = await this.extractPdfText(
      dto.fileBuffer,
      dto.originalFilename
    );

    // If this resume is being set as default, unset all others first
    if (dto.isDefault) {
      await this.clearDefaultResumes(userId);
    }

    // Determine if this should be the default (auto-default if it's the first)
    const existingCount = await prisma.resume.count({ where: { userId } });
    const shouldBeDefault = dto.isDefault ?? existingCount === 0;

    if (shouldBeDefault && existingCount > 0) {
      await this.clearDefaultResumes(userId);
    }

    const resume = await prisma.resume.create({
      data: {
        userId,
        name: dto.name,
        content: extractedText,
        isDefault: shouldBeDefault,
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        // Never return full content in list — only in getById
        content: false,
      },
    });

    logger.info(`Resume created: ${resume.id} for user ${userId}`);
    return resume;
  }

  // ── List all for user ─────────────────────────────────────
  async findAll(userId: string) {
    return prisma.resume.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ── Get single (includes content) ────────────────────────
  async findById(id: string, userId: string) {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw AppError.notFound('Resume not found');
    }

    return resume;
  }

  // ── Update metadata ───────────────────────────────────────
  async update(id: string, userId: string, dto: UpdateResumeDto) {
    await this.assertOwnership(id, userId);

    if (dto.isDefault) {
      await this.clearDefaultResumes(userId);
    }

    return prisma.resume.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────
  async delete(id: string, userId: string) {
    const resume = await this.assertOwnership(id, userId);

    await prisma.resume.delete({ where: { id } });

    // If the deleted resume was the default, promote the most recent one
    if (resume.isDefault) {
      const next = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await prisma.resume.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info(`Resume deleted: ${id} for user ${userId}`);
  }

  // ── AI Analysis + persist ────────────────────────────────
  async analyze(id: string, userId: string) {
    // 1. Verify ownership and fetch resume text
    const resume = await this.findById(id, userId);

    if (!resume.content?.trim()) {
      throw AppError.badRequest('Resume has no extracted text to analyze');
    }

    logger.info(`Analyzing resume ${id} for user ${userId}`);

    // 2. Send to Gemini — throws AppError(502) on failure after retries
    const analysis = await geminiService.analyzeResume(resume.content);

    // 3. Persist the structured result (upsert so re-analysis overwrites)
    const profile = await prisma.resumeProfile.upsert({
      where: { resumeId: id },
      create: {
        resumeId: id,
        summary: analysis.summary,
        skills: analysis.skills,
        yearsOfExperience: analysis.yearsOfExperience,
        jobTitles: analysis.jobTitles,
        technologies: analysis.technologies,
        education: analysis.education,
      },
      update: {
        summary: analysis.summary,
        skills: analysis.skills,
        yearsOfExperience: analysis.yearsOfExperience,
        jobTitles: analysis.jobTitles,
        technologies: analysis.technologies,
        education: analysis.education,
        analyzedAt: new Date(),
      },
    });

    logger.info(`Resume profile saved: ${profile.id} for resume ${id}`);

    // 4. Return analysis merged with persistence metadata
    return {
      ...analysis,
      resumeId: id,
      profileId: profile.id,
      analyzedAt: profile.analyzedAt,
    };
  }

  // ── Get stored analysis ───────────────────────────────────
  async getAnalysis(id: string, userId: string) {
    // Verify ownership first
    await this.assertOwnership(id, userId);

    const profile = await prisma.resumeProfile.findUnique({
      where: { resumeId: id },
    });

    if (!profile) {
      throw AppError.notFound(
        'No analysis found for this resume. Run POST /resumes/:id/analyze first.'
      );
    }

    return profile;
  }

  // ── Helpers ───────────────────────────────────────────────

  private async extractPdfText(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    try {
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim();

      if (!text || text.length < 50) {
        throw new AppError(
          'Could not extract readable text from the PDF. ' +
            'Make sure it is a text-based PDF, not a scanned image.',
          422
        );
      }

      return text;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(`PDF parse error for ${filename}:`, err);
      throw new AppError('Failed to parse the PDF file. Please try another file.', 422);
    }
  }

  private async clearDefaultResumes(userId: string): Promise<void> {
    await prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private async assertOwnership(id: string, userId: string) {
    const resume = await prisma.resume.findFirst({ where: { id, userId } });
    if (!resume) {
      throw AppError.notFound('Resume not found');
    }
    return resume;
  }
}

export const resumesService = new ResumesService();
