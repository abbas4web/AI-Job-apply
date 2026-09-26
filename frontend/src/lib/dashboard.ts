import { apiClient } from './api';

export interface RecentApplication {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  matchScore: number | null;
  createdAt: string;
}

export interface DashboardStats {
  totalJobs: number;
  matchedJobs: number;
  totalApplications: number;
  interviews: number;
  averageMatchScore: number | null;
  applicationsByStatus: Record<string, number>;
  recentApplications: RecentApplication[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<{ success: boolean; data: DashboardStats }>(
    '/dashboard/stats'
  );
  return res.data.data;
}
