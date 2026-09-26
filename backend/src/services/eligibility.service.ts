import { type UserAutomationSettings } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** Snapshot of job fields needed for eligibility evaluation */
export interface EligibilityJobSnapshot {
  id:       string;
  title:    string;
  company:  string;
  location: string;
  skills:   string[];
}

/** Inputs to the pure eligibility checker — all required, no DB calls */
export interface EligibilityInput {
  matchScore:       number;
  job:              EligibilityJobSnapshot;
  settings:         UserAutomationSettings;
  alreadyApplied:   boolean;
}

/** A single failing condition — describes exactly why eligibility was denied */
export interface EligibilityFailure {
  code:   string;
  reason: string;
}

/** Result of an eligibility check — always produced, never throws */
export interface EligibilityResult {
  eligible:   boolean;
  /** Present when eligible=false — at least one entry */
  failures:  EligibilityFailure[];
  /** Summary string for logging */
  summary:   string;
}

// ─────────────────────────────────────────────────────────────
// Pure eligibility checker
//
// ALL business rules live here — no Gemini, no DB calls.
// Rules are evaluated in priority order; all failures are
// collected so the caller can see every blocking condition at once.
// ─────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

function includesIgnoreCase(haystack: string[], needle: string): boolean {
  const n = normalise(needle);
  return haystack.some((h) => normalise(h) === n);
}

function partialMatchIgnoreCase(haystack: string[], needle: string): boolean {
  const n = normalise(needle);
  return haystack.some(
    (h) => normalise(h).includes(n) || n.includes(normalise(h)),
  );
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const { matchScore, job, settings, alreadyApplied } = input;
  const failures: EligibilityFailure[] = [];

  // ── Rule 1: autoApplyEnabled must be on ─────────────────────
  if (!settings.autoApplyEnabled) {
    failures.push({
      code:   'AUTO_APPLY_DISABLED',
      reason: 'Automatic application is turned off in your settings.',
    });
  }

  // ── Rule 2: matchScore must meet the threshold ───────────────
  if (matchScore < settings.minimumMatchScore) {
    failures.push({
      code:   'SCORE_BELOW_THRESHOLD',
      reason:
        `Match score ${matchScore} is below your minimum of ${settings.minimumMatchScore}.`,
    });
  }

  // ── Rule 3: company must not be excluded ─────────────────────
  if (
    settings.excludedCompanies.length > 0 &&
    includesIgnoreCase(settings.excludedCompanies, job.company)
  ) {
    failures.push({
      code:   'COMPANY_EXCLUDED',
      reason: `"${job.company}" is in your excluded companies list.`,
    });
  }

  // ── Rule 4: preferred job titles filter (if set) ─────────────
  // An empty preferredJobTitles list means "no restriction".
  // When set, the job title must partially match at least one entry.
  if (settings.preferredJobTitles.length > 0) {
    const titleMatches = partialMatchIgnoreCase(
      settings.preferredJobTitles,
      job.title,
    );
    if (!titleMatches) {
      failures.push({
        code:   'TITLE_NOT_PREFERRED',
        reason:
          `"${job.title}" does not match any of your preferred job titles ` +
          `(${settings.preferredJobTitles.join(', ')}).`,
      });
    }
  }

  // ── Rule 5: preferred locations filter (if set) ──────────────
  // An empty preferredLocations list means "no restriction".
  if (settings.preferredLocations.length > 0) {
    const locationMatches = partialMatchIgnoreCase(
      settings.preferredLocations,
      job.location,
    );
    if (!locationMatches) {
      failures.push({
        code:   'LOCATION_NOT_PREFERRED',
        reason:
          `"${job.location}" does not match any of your preferred locations ` +
          `(${settings.preferredLocations.join(', ')}).`,
      });
    }
  }

  // ── Rule 6: required skills must all be present in the job ───
  // An empty requiredSkills list means "no restriction".
  if (settings.requiredSkills.length > 0) {
    const missingRequired = settings.requiredSkills.filter(
      (skill) => !includesIgnoreCase(job.skills, skill),
    );
    if (missingRequired.length > 0) {
      failures.push({
        code:   'REQUIRED_SKILLS_MISSING',
        reason:
          `The job is missing required skills: ${missingRequired.join(', ')}.`,
      });
    }
  }

  // ── Rule 7: must not have already applied ────────────────────
  if (alreadyApplied) {
    failures.push({
      code:   'ALREADY_APPLIED',
      reason: 'An application for this job already exists.',
    });
  }

  const eligible = failures.length === 0;
  const summary  = eligible
    ? `eligible — score=${matchScore} job="${job.title}" company="${job.company}"`
    : `ineligible (${failures.map((f) => f.code).join(', ')}) — ` +
      `score=${matchScore} job="${job.title}" company="${job.company}"`;

  return { eligible, failures, summary };
}

// ─────────────────────────────────────────────────────────────
// EligibilityService
//
// Thin orchestration layer: fetches the required data from the DB
// and delegates the actual decision to evaluateEligibility().
// ─────────────────────────────────────────────────────────────

export class EligibilityService {
  /**
   * checkEligibility — determines whether a job should be
   * automatically applied to on behalf of a user.
   *
   * @param userId     - The user to evaluate for
   * @param jobId      - The job under consideration
   * @param matchScore - Gemini score already computed for this pair
   *
   * Returns a full EligibilityResult — never throws.
   * The caller decides what to do with it.
   */
  async checkEligibility(
    userId:     string,
    jobId:      string,
    matchScore: number,
  ): Promise<EligibilityResult> {
    // Fetch all required data in parallel
    const [job, settings, existingApplication] = await Promise.all([
      prisma.job.findUnique({
        where:  { id: jobId },
        select: { id: true, title: true, company: true, location: true, skills: true },
      }),

      // getOrCreate via raw upsert so we don't import the full SettingsService
      // and create a circular dependency.
      prisma.userAutomationSettings.upsert({
        where:  { userId },
        create: {
          userId,
          minimumMatchScore:  70,
          preferredJobTitles: [],
          preferredLocations: [],
          requiredSkills:     [],
          excludedCompanies:  [],
          autoApplyEnabled:   false,
        },
        update: {},
      }),

      prisma.application.findUnique({
        where:  { userId_jobId: { userId, jobId } },
        select: { id: true },
      }),
    ]);

    // Job must exist — surface a clear ineligibility rather than throwing
    if (!job) {
      const result: EligibilityResult = {
        eligible:  false,
        failures:  [{ code: 'JOB_NOT_FOUND', reason: `Job ${jobId} does not exist.` }],
        summary:   `ineligible (JOB_NOT_FOUND) — jobId=${jobId}`,
      };
      logger.warn(`[eligibility] ${result.summary} userId=${userId}`);
      return result;
    }

    const result = evaluateEligibility({
      matchScore,
      job,
      settings,
      alreadyApplied: existingApplication !== null,
    });

    logger.info(
      `[eligibility] ${result.summary} userId=${userId} jobId=${jobId}`,
    );

    return result;
  }
}

export const eligibilityService = new EligibilityService();
