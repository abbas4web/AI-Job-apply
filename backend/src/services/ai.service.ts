import { prisma } from '../config/database';
import { geminiService, type JobMatchInput, type CoverLetterInput } from './gemini.service';
import { jobsService } from './jobs.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { JobMatch } from './schemas/jobMatch.schema';
import type { CoverLetter } from './schemas/coverLetter.schema';

// ── Shared helper ─────────────────────────────────────────────

/**
 * Assembles a JobMatchInput from a resume profile + job record.
 * Extracted so both matchJob() and matchJobForUser() share the same
 * mapping logic without duplication.
 */
function buildMatchInput(
  profile: {
    summary:           string;
    skills:            string[];
    yearsOfExperience: number;
    jobTitles:         string[];
    technologies:      string[];
  },
  job: {
    title:       string;
    company:     string;
    description: string;
    skills:      string[];
    location:    string;
  },
): JobMatchInput {
  return {
    resumeProfile: {
      summary:           profile.summary,
      skills:            profile.skills,
      yearsOfExperience: profile.yearsOfExperience,
      jobTitles:         profile.jobTitles,
      technologies:      profile.technologies,
      // ResumeProfile has no location field — leave undefined
    },
    jobTitle:       job.title,
    company:        job.company,
    jobDescription: job.description,
    requiredSkills: job.skills,
    jobLocation:    job.location,
  };
}

// ─────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────

export interface MatchJobForUserResult {
  /** The resume that was resolved and used for matching */
  resumeId: string;
  match:    JobMatch;
}

// ─────────────────────────────────────────────────────────────
// AiService — high-level AI tasks.
//
// Responsibilities:
//   - Fetch and validate the required DB records (resume profile, job)
//   - Assemble the input for GeminiService
//   - Return structured results to the controller
//
// This layer deliberately does NOT decide what to do with scores.
// Application auto-send logic lives in the applications service.
// ─────────────────────────────────────────────────────────────

export class AiService {
  /**
   * matchJob — scores how well a user's stored resume profile fits a job.
   *
   * @param userId   - Verified owner of the resume (from JWT)
   * @param resumeId - The resume whose stored AI profile to use
   * @param jobId    - The job to match against
   */
  async matchJob(
    userId:   string,
    resumeId: string,
    jobId:    string,
  ): Promise<JobMatch> {
    // ── 1. Fetch the resume profile (enforces ownership) ──────
    const resume = await prisma.resume.findFirst({
      where:  { id: resumeId, userId },
      select: { id: true, profile: true },
    });

    if (!resume) {
      throw AppError.notFound('Resume not found');
    }

    if (!resume.profile) {
      throw AppError.badRequest(
        'This resume has not been analysed yet. ' +
        'Run POST /resumes/:id/analyze first to generate a profile.',
      );
    }

    const profile = resume.profile;

    // ── 2. Fetch the job ──────────────────────────────────────
    const job = await jobsService.findById(jobId);

    // ── 3. Assemble Gemini input ──────────────────────────────
    const input = buildMatchInput(profile, job);

    logger.info(
      `[AiService] matchJob — resume=${resumeId} job=${jobId} user=${userId}`,
    );

    // ── 4. Call Gemini — throws AppError(502) after retries ───
    const result = await geminiService.matchJob(input);

    logger.info(
      `[AiService] matchJob complete — score=${result.matchScore} ` +
      `resume=${resumeId} job=${jobId}`,
    );

    return result;
  }

  /**
   * matchJobForUser — resolves the user's default (or most-recent) resume
   * automatically, then scores it against the given job.
   *
   * Used by POST /api/v1/jobs/:jobId/match so the caller only needs to
   * supply a jobId — no resumeId in the request body.
   *
   * Returns a pure JobMatch signal. No emails, no applications.
   */
  async matchJobForUser(userId: string, jobId: string): Promise<MatchJobForUserResult> {
    // ── 1. Resolve the user's best resume (default first, else most recent) ──
    const resume = await prisma.resume.findFirst({
      where: { userId },
      select: { id: true, name: true, isDefault: true, profile: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (!resume) {
      throw AppError.notFound(
        'No resume found. Upload a resume first.',
      );
    }

    if (!resume.profile) {
      throw AppError.badRequest(
        `Resume "${resume.name}" has not been analysed yet. ` +
        'Run POST /resumes/:id/analyze first to generate a profile.',
      );
    }

    // ── 2. Fetch the job ──────────────────────────────────────
    const job = await jobsService.findById(jobId);

    // ── 3. Assemble Gemini input ──────────────────────────────
    const input = buildMatchInput(resume.profile, job);

    logger.info(
      `[AiService] matchJobForUser — resume=${resume.id} job=${jobId} user=${userId}`,
    );

    // ── 4. Call Gemini — throws AppError(502) after retries ───
    const result = await geminiService.matchJob(input);

    logger.info(
      `[AiService] matchJobForUser complete — score=${result.matchScore} ` +
      `resume=${resume.id} job=${jobId}`,
    );

    return { resumeId: resume.id, match: result };
  }

  /**
   * generateCoverLetter — fetches the user's resume profile and a job,
   * then asks Gemini to write a grounded cover letter.
   *
   * @param userId   - Verified owner of the resume (from JWT)
   * @param resumeId - Resume whose stored AI profile to use as the basis
   * @param jobId    - The job the letter is being written for
   *
   * Returns a { subject, body } object — no fabrication guaranteed by prompt.
   */
  async generateCoverLetter(
    userId:   string,
    resumeId: string,
    jobId:    string,
  ): Promise<CoverLetter> {
    // ── 1. Fetch and verify the resume profile ────────────────
    const resume = await prisma.resume.findFirst({
      where:  { id: resumeId, userId },
      select: { id: true, name: true, profile: true },
    });

    if (!resume) {
      throw AppError.notFound('Resume not found');
    }

    if (!resume.profile) {
      throw AppError.badRequest(
        `Resume "${resume.name}" has not been analysed yet. ` +
        'Run POST /resumes/:id/analyze first to generate a profile.',
      );
    }

    // ── 2. Fetch the job ──────────────────────────────────────
    const job = await jobsService.findById(jobId);

    // ── 3. Assemble Gemini input ──────────────────────────────
    // education is stored as Json in Prisma — cast safely.
    const educationRaw = resume.profile.education as Array<{
      degree: string; field: string; institution: string; year?: number;
    }>;

    const input: CoverLetterInput = {
      resumeProfile: {
        summary:           resume.profile.summary,
        skills:            resume.profile.skills,
        yearsOfExperience: resume.profile.yearsOfExperience,
        jobTitles:         resume.profile.jobTitles,
        technologies:      resume.profile.technologies,
        education:         Array.isArray(educationRaw) ? educationRaw : [],
      },
      jobTitle:       job.title,
      company:        job.company,
      jobDescription: job.description,
    };

    logger.info(
      `[AiService] generateCoverLetter — resume=${resumeId} job=${jobId} user=${userId}`,
    );

    // ── 4. Call Gemini ────────────────────────────────────────
    const result = await geminiService.generateCoverLetter(input);

    logger.info(
      `[AiService] generateCoverLetter complete — resume=${resumeId} job=${jobId}`,
    );

    return result;
  }
}

export const aiService = new AiService();
