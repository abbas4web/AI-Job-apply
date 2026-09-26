import { prisma } from '../config/database';
import { geminiService, type JobMatchInput } from './gemini.service';
import { jobsService } from './jobs.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { JobMatch } from './schemas/jobMatch.schema';

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
    const input: JobMatchInput = {
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
}

export const aiService = new AiService();
