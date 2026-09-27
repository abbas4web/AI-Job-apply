/**
 * eligibility.test.ts
 *
 * Tests the pure evaluateEligibility() function — no DB, no network.
 * This is the core business logic for automation decisions.
 */
import { describe, it, expect } from 'vitest';
import { evaluateEligibility, type EligibilityInput } from '../services/eligibility.service';
import type { UserAutomationSettings } from '@prisma/client';

// ── Base settings — safe defaults ─────────────────────────────
const BASE_SETTINGS: UserAutomationSettings = {
  id:                 'settings-001',
  userId:             'user-001',
  minimumMatchScore:  70,
  preferredJobTitles: [],
  preferredLocations: [],
  requiredSkills:     [],
  excludedCompanies:  [],
  autoApplyEnabled:   true,
  createdAt:          new Date(),
  updatedAt:          new Date(),
};

const BASE_JOB = {
  id:       'job-001',
  title:    'Senior Backend Engineer',
  company:  'Acme Corp',
  location: 'Remote',
  skills:   ['Node.js', 'TypeScript'],
};

function makeInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    matchScore:     80,
    job:            BASE_JOB,
    settings:       BASE_SETTINGS,
    alreadyApplied: false,
    ...overrides,
  };
}

describe('evaluateEligibility — eligible path', () => {
  it('returns eligible when all conditions are met', () => {
    const result = evaluateEligibility(makeInput());
    expect(result.eligible).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

describe('evaluateEligibility — auto-apply disabled', () => {
  it('returns ineligible when autoApplyEnabled is false', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, autoApplyEnabled: false } })
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'AUTO_APPLY_DISABLED')).toBe(true);
  });
});

describe('evaluateEligibility — match score threshold', () => {
  it('blocks when score is below minimumMatchScore', () => {
    const result = evaluateEligibility(makeInput({ matchScore: 50 }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'SCORE_BELOW_THRESHOLD')).toBe(true);
  });

  it('allows when score exactly equals minimumMatchScore', () => {
    const result = evaluateEligibility(makeInput({ matchScore: 70 }));
    expect(result.eligible).toBe(true);
  });

  it('allows when score is above minimumMatchScore', () => {
    const result = evaluateEligibility(makeInput({ matchScore: 95 }));
    expect(result.eligible).toBe(true);
  });
});

describe('evaluateEligibility — excluded companies', () => {
  it('blocks when company is in excludedCompanies', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, excludedCompanies: ['Acme Corp', 'BadCo'] } })
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'COMPANY_EXCLUDED')).toBe(true);
  });

  it('is case-insensitive for excluded companies', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, excludedCompanies: ['acme corp'] } })
    );
    expect(result.eligible).toBe(false);
  });

  it('allows when company is not excluded', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, excludedCompanies: ['OtherCo'] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('evaluateEligibility — preferred job titles', () => {
  it('blocks when job title does not match preferred titles', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, preferredJobTitles: ['Frontend Engineer', 'Product Manager'] } })
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'TITLE_NOT_PREFERRED')).toBe(true);
  });

  it('allows when job title partially matches a preferred title', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, preferredJobTitles: ['Backend Engineer'] } })
    );
    // "Senior Backend Engineer" contains "Backend Engineer"
    expect(result.eligible).toBe(true);
  });

  it('allows when preferredJobTitles is empty (no restriction)', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, preferredJobTitles: [] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('evaluateEligibility — preferred locations', () => {
  it('blocks when job location does not match preferred locations', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, preferredLocations: ['Berlin', 'London'] } })
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'LOCATION_NOT_PREFERRED')).toBe(true);
  });

  it('allows when job is remote and Remote is preferred', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, preferredLocations: ['Remote'] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('evaluateEligibility — required skills', () => {
  it('blocks when job is missing a required skill', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, requiredSkills: ['Node.js', 'Kubernetes'] } })
    );
    // Job only has Node.js and TypeScript — Kubernetes is missing
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'REQUIRED_SKILLS_MISSING')).toBe(true);
  });

  it('allows when all required skills are present in the job', () => {
    const result = evaluateEligibility(
      makeInput({ settings: { ...BASE_SETTINGS, requiredSkills: ['Node.js'] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('evaluateEligibility — already applied', () => {
  it('blocks when alreadyApplied is true', () => {
    const result = evaluateEligibility(makeInput({ alreadyApplied: true }));
    expect(result.eligible).toBe(false);
    expect(result.failures.some((f) => f.code === 'ALREADY_APPLIED')).toBe(true);
  });
});

describe('evaluateEligibility — multiple failures collected', () => {
  it('reports all failing conditions at once', () => {
    const result = evaluateEligibility(
      makeInput({
        matchScore:     40, // below threshold
        alreadyApplied: true,
        settings: { ...BASE_SETTINGS, excludedCompanies: ['Acme Corp'] },
      })
    );
    expect(result.eligible).toBe(false);
    const codes = result.failures.map((f) => f.code);
    expect(codes).toContain('SCORE_BELOW_THRESHOLD');
    expect(codes).toContain('COMPANY_EXCLUDED');
    expect(codes).toContain('ALREADY_APPLIED');
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
  });
});
