import { prisma } from '../config/database';
import { ApplicationStatus } from '@prisma/client';

export interface DashboardStats {
  totalJobs: number;
  matchedJobs: number;
  totalApplications: number;
  interviews: number;
  averageMatchScore: number | null;
  applicationsByStatus: Record<string, number>;
  recentApplications: RecentApplication[];
}

export interface RecentApplication {
  id: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  matchScore: number | null;
  createdAt: Date;
}

export const dashboardService = {
  async getStats(userId: string): Promise<DashboardStats> {
    // Run all queries in parallel for speed
    const [
      totalJobs,
      applications,
      matchResults,
      recentApplications,
    ] = await Promise.all([
      // Total jobs in the system
      prisma.job.count({ where: { isDuplicate: false } }),

      // All of this user's applications
      prisma.application.findMany({
        where: { userId },
        select: { id: true, status: true, matchScore: true },
      }),

      // Completed match results for this user
      prisma.jobMatchResult.findMany({
        where: { userId, status: 'COMPLETED', matchScore: { not: null } },
        select: { matchScore: true },
      }),

      // 5 most recent applications with job info
      prisma.application.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          matchScore: true,
          createdAt: true,
          job: { select: { title: true, company: true } },
        },
      }),
    ]);

    // Aggregate application status counts
    const applicationsByStatus = applications.reduce<Record<string, number>>(
      (acc, app) => {
        acc[app.status] = (acc[app.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    // Count MATCHED = any application that has a matchScore (AI scored it)
    const matchedJobs = applications.filter((a) => a.matchScore !== null).length;

    // Count INTERVIEW status
    const interviews = applicationsByStatus[ApplicationStatus.INTERVIEW] ?? 0;

    // Average match score across all completed results
    const scores = matchResults.map((r) => r.matchScore as number);
    const averageMatchScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
        : null;

    return {
      totalJobs,
      matchedJobs,
      totalApplications: applications.length,
      interviews,
      averageMatchScore,
      applicationsByStatus,
      recentApplications: recentApplications.map((a) => ({
        id: a.id,
        jobTitle: a.job.title,
        company: a.job.company,
        status: a.status,
        matchScore: a.matchScore,
        createdAt: a.createdAt,
      })),
    };
  },
};
