import { apiClient } from './api';

export interface AutomationSettings {
  id: string;
  userId: string;
  minimumMatchScore: number;
  preferredJobTitles: string[];
  preferredLocations: string[];
  requiredSkills: string[];
  excludedCompanies: string[];
  autoApplyEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UpdateAutomationSettings = Partial<
  Omit<AutomationSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

/** GET /settings/automation */
export async function fetchAutomationSettings(): Promise<AutomationSettings> {
  const res = await apiClient.get<{ success: boolean; data: AutomationSettings }>(
    '/settings/automation'
  );
  return res.data.data;
}

/** PATCH /settings/automation */
export async function updateAutomationSettings(
  payload: UpdateAutomationSettings
): Promise<AutomationSettings> {
  const res = await apiClient.patch<{ success: boolean; data: AutomationSettings }>(
    '/settings/automation',
    payload
  );
  return res.data.data;
}
