import jwt from 'jsonwebtoken';
import type { Express } from 'express';

/** Generate a signed JWT for the given userId — uses the test JWT_SECRET */
export function makeToken(userId: string, role = 'USER'): string {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

/** Auth header object ready to spread into supertest `.set()` */
export function authHeader(userId: string) {
  return { Authorization: `Bearer ${makeToken(userId)}` };
}

// ── Shared mock data fixtures ──────────────────────────────────

export const TEST_USER = {
  id:           'user-test-001',
  email:        'test@example.com',
  name:         'Test User',
  role:         'USER' as const,
  passwordHash: '$2a$12$placeholder',
  createdAt:    new Date(),
  updatedAt:    new Date(),
};

export const TEST_JOB = {
  id:          'job-test-001',
  title:       'Senior Backend Engineer',
  company:     'Acme Corp',
  location:    'Remote',
  description: 'Looking for a senior backend engineer with Node.js experience.',
  skills:      ['Node.js', 'TypeScript', 'PostgreSQL'],
  source:      'OTHER' as const,
  sourceUrl:   'https://example.com/job/001',
  externalId:  'ext-001',
  salary:      '$120,000',
  isDuplicate: false,
  postedAt:    new Date(),
  createdAt:   new Date(),
  updatedAt:   new Date(),
};

export const TEST_RESUME = {
  id:        'resume-test-001',
  userId:    TEST_USER.id,
  name:      'My Resume',
  content:   'John Doe\nSoftware Engineer\n5 years experience with Node.js and TypeScript.',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const TEST_RESUME_PROFILE = {
  id:                'profile-test-001',
  resumeId:          TEST_RESUME.id,
  summary:           'Experienced backend engineer.',
  skills:            ['Node.js', 'TypeScript', 'REST APIs'],
  yearsOfExperience: 5,
  jobTitles:         ['Software Engineer', 'Backend Developer'],
  technologies:      ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis'],
  education:         [{ degree: 'BSc', field: 'Computer Science', institution: 'MIT', year: 2018 }],
  analyzedAt:        new Date(),
  updatedAt:         new Date(),
};

/** A mock JobMatch result returned by geminiService.matchJob */
export const MOCK_JOB_MATCH = {
  matchScore:      82,
  matchedSkills:   ['Node.js', 'TypeScript'],
  missingSkills:   ['PostgreSQL'],
  experienceMatch: true,
  locationMatch:   true,
  reason:          'Candidate has strong Node.js and TypeScript skills matching 2 of 3 requirements. Experience level aligns with the role. Location is compatible as remote work is accepted.',
};

/** A mock ResumeAnalysis returned by geminiService.analyzeResume */
export const MOCK_RESUME_ANALYSIS = {
  summary:           'Experienced backend engineer with 5 years of Node.js experience.',
  skills:            ['REST API Design', 'System Architecture'],
  yearsOfExperience: 5,
  jobTitles:         ['Software Engineer'],
  technologies:      ['Node.js', 'TypeScript', 'PostgreSQL'],
  education:         [{ degree: 'BSc', field: 'Computer Science', institution: 'MIT', year: 2018 }],
};
