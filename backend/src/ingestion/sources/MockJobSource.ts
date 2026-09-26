import { JobSource } from '@prisma/client';
import { BaseJobSource } from '../BaseJobSource';
import type { RawJob, IngestionParams } from '../types';

// ─────────────────────────────────────────────────────────────
// MockJobSource — deterministic fake data for development and
// testing. Never makes any network calls.
//
// Behaviour:
//   • Returns up to `params.limit` (default 10) jobs
//   • Filters the pool by query (case-insensitive title/company match)
//   • Filters by location when params.location is provided
//   • externalId is stable so re-running won't create duplicates
// ─────────────────────────────────────────────────────────────

const MOCK_POOL: RawJob[] = [
  {
    externalId:  'mock-001',
    title:       'Senior Backend Engineer',
    company:     'Acme Corp',
    location:    'Remote',
    description: 'We are looking for a Senior Backend Engineer to join our growing platform team. ' +
      'You will design and maintain REST and GraphQL APIs, own the CI/CD pipeline, and mentor junior engineers. ' +
      'Our stack: Node.js, TypeScript, PostgreSQL, Redis, Kubernetes.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-001',
    skills:      ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Kubernetes'],
    salary:      '$120,000 – $160,000',
    postedAt:    daysAgo(1),
  },
  {
    externalId:  'mock-002',
    title:       'Frontend Engineer',
    company:     'TechFlow Inc',
    location:    'New York, NY',
    description: 'Join TechFlow as a Frontend Engineer and build the next generation of our SaaS dashboard. ' +
      'You will own component libraries, performance budgets, and work closely with design. ' +
      'Stack: React, TypeScript, Tailwind CSS, Vite.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-002',
    skills:      ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    salary:      '$100,000 – $130,000',
    postedAt:    daysAgo(2),
  },
  {
    externalId:  'mock-003',
    title:       'Full Stack Developer',
    company:     'StartupXYZ',
    location:    'Remote',
    description: 'StartupXYZ is hiring a Full Stack Developer to help us scale from 0 to 1. ' +
      'You will build features end-to-end: REST APIs, React frontends, and database schema design. ' +
      'Stack: Next.js, Prisma, PostgreSQL, Vercel.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-003',
    skills:      ['Next.js', 'Prisma', 'PostgreSQL', 'Vercel'],
    salary:      '$90,000 – $120,000',
    postedAt:    daysAgo(3),
  },
  {
    externalId:  'mock-004',
    title:       'DevOps Engineer',
    company:     'CloudBase',
    location:    'Austin, TX',
    description: 'CloudBase needs a DevOps Engineer to manage our AWS infrastructure and improve deployment ' +
      'reliability. You will own Terraform configs, GitHub Actions pipelines, and on-call rotations. ' +
      'Stack: AWS, Terraform, Docker, GitHub Actions.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-004',
    skills:      ['AWS', 'Terraform', 'Docker', 'GitHub Actions'],
    salary:      '$130,000 – $155,000',
    postedAt:    daysAgo(4),
  },
  {
    externalId:  'mock-005',
    title:       'Machine Learning Engineer',
    company:     'DataMind',
    location:    'San Francisco, CA',
    description: 'DataMind is looking for an ML Engineer to productionise our recommendation models. ' +
      'You will work with data scientists to wrap models in APIs, build feature pipelines, and monitor drift. ' +
      'Stack: Python, FastAPI, MLflow, GCP.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-005',
    skills:      ['Python', 'FastAPI', 'MLflow', 'GCP', 'Machine Learning'],
    salary:      '$150,000 – $190,000',
    postedAt:    daysAgo(5),
  },
  {
    externalId:  'mock-006',
    title:       'iOS Developer',
    company:     'MobileFirst',
    location:    'Remote',
    description: 'MobileFirst is looking for an iOS Developer to build our consumer app from scratch. ' +
      'You will own the full mobile release cycle, from design collaboration to App Store deployment. ' +
      'Stack: Swift, SwiftUI, Combine, XCTest.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-006',
    skills:      ['Swift', 'SwiftUI', 'Combine', 'XCTest'],
    salary:      '$110,000 – $145,000',
    postedAt:    daysAgo(6),
  },
  {
    externalId:  'mock-007',
    title:       'Backend Engineer',
    company:     'FinTech Labs',
    location:    'London, UK',
    description: 'FinTech Labs is expanding its backend team. You will build high-throughput payment ' +
      'processing microservices, own observability, and collaborate with compliance. ' +
      'Stack: Go, gRPC, PostgreSQL, Kafka, Prometheus.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-007',
    skills:      ['Go', 'gRPC', 'PostgreSQL', 'Kafka', 'Prometheus'],
    salary:      '£80,000 – £110,000',
    postedAt:    daysAgo(7),
  },
  {
    externalId:  'mock-008',
    title:       'Android Developer',
    company:     'AppVenture',
    location:    'Berlin, DE',
    description: 'AppVenture is hiring an Android Developer to build features in our 5M-user fitness app. ' +
      'You will own Kotlin coroutines, Jetpack Compose UI, and Google Play releases. ' +
      'Stack: Kotlin, Jetpack Compose, Retrofit, Room.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-008',
    skills:      ['Kotlin', 'Jetpack Compose', 'Retrofit', 'Room'],
    salary:      '€70,000 – €90,000',
    postedAt:    daysAgo(8),
  },
  {
    externalId:  'mock-009',
    title:       'Security Engineer',
    company:     'SecureNet',
    location:    'Remote',
    description: 'SecureNet is building its first internal security team. You will conduct threat modelling, ' +
      'own SAST/DAST pipelines, and run penetration tests on our cloud infrastructure. ' +
      'Stack: Python, AWS, Burp Suite, Semgrep.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-009',
    skills:      ['Python', 'AWS', 'Burp Suite', 'Semgrep', 'Penetration Testing'],
    salary:      '$140,000 – $170,000',
    postedAt:    daysAgo(10),
  },
  {
    externalId:  'mock-010',
    title:       'Staff Engineer',
    company:     'ScaleUp Co',
    location:    'New York, NY',
    description: 'ScaleUp Co is looking for a Staff Engineer to set technical direction across three product ' +
      'squads. You will lead architecture reviews, drive cross-team initiatives, and grow senior engineers. ' +
      'Stack: TypeScript, Go, PostgreSQL, Kubernetes, gRPC.',
    sourceUrl:   'https://example-jobs.dev/mock/mock-010',
    skills:      ['TypeScript', 'Go', 'PostgreSQL', 'Kubernetes', 'gRPC'],
    salary:      '$200,000 – $240,000',
    postedAt:    daysAgo(14),
  },
];

// ─────────────────────────────────────────────────────────────

export class MockJobSource extends BaseJobSource {
  readonly source = JobSource.OTHER;

  async fetch(params: IngestionParams): Promise<RawJob[]> {
    const limit    = this.clamp(params.limit ?? 10, 1, MOCK_POOL.length);
    const query    = params.query.toLowerCase().trim();
    const location = params.location?.toLowerCase().trim();

    let results = MOCK_POOL.filter((job) => {
      // Empty or very short queries match everything
      const matchesQuery =
        !query ||
        query.length < 3 ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        (job.skills ?? []).some((s) => s.toLowerCase().includes(query));

      const matchesLocation =
        !location ||
        job.location.toLowerCase().includes(location);

      return matchesQuery && matchesLocation;
    });

    // Simulate a short async delay (as a real HTTP call would have)
    await delay(50);

    return results.slice(0, limit);
  }
}

// ── Helpers ───────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
