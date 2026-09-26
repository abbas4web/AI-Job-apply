import { type UserAutomationSettings } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { UpdateAutomationSettingsInput } from '../middleware/schemas/settings.schemas';

// ─────────────────────────────────────────────────────────────
// SettingsService
//
// Manages the UserAutomationSettings record for each user.
//
// Design decisions:
//   - getOrCreate() is idempotent — the first GET creates a row
//     with safe defaults so the API always returns something useful.
//   - autoApplyEnabled is stored but the backend does NOT trigger
//     automatic application sends yet. It is read-only from the
//     automation pipeline's perspective until that feature ships.
// ─────────────────────────────────────────────────────────────

export class SettingsService {
  /**
   * getOrCreate — returns the user's settings, creating them with
   * safe defaults if they don't exist yet.
   *
   * Safe defaults:
   *   minimumMatchScore: 70   (require a decent match before acting)
   *   autoApplyEnabled:  false (opt-in, never on by default)
   *   all arrays:        []   (no restrictions until the user sets them)
   */
  async getOrCreate(userId: string): Promise<UserAutomationSettings> {
    const existing = await prisma.userAutomationSettings.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    logger.info(`[settings] creating default automation settings for userId=${userId}`);

    return prisma.userAutomationSettings.create({
      data: {
        userId,
        minimumMatchScore:  70,
        preferredJobTitles: [],
        preferredLocations: [],
        requiredSkills:     [],
        excludedCompanies:  [],
        autoApplyEnabled:   false,
      },
    });
  }

  /**
   * update — applies a partial update to the user's settings.
   * Uses upsert so concurrent first-time requests can't race to create
   * two rows.
   */
  async update(
    userId: string,
    dto:    UpdateAutomationSettingsInput,
  ): Promise<UserAutomationSettings> {
    // Build the data object with only the fields the caller sent
    const data = {
      ...(dto.minimumMatchScore  !== undefined && { minimumMatchScore:  dto.minimumMatchScore }),
      ...(dto.preferredJobTitles !== undefined && { preferredJobTitles: dto.preferredJobTitles }),
      ...(dto.preferredLocations !== undefined && { preferredLocations: dto.preferredLocations }),
      ...(dto.requiredSkills     !== undefined && { requiredSkills:     dto.requiredSkills }),
      ...(dto.excludedCompanies  !== undefined && { excludedCompanies:  dto.excludedCompanies }),
      ...(dto.autoApplyEnabled   !== undefined && { autoApplyEnabled:   dto.autoApplyEnabled }),
    };

    // upsert: create with defaults + the supplied fields if not yet created
    const settings = await prisma.userAutomationSettings.upsert({
      where:  { userId },
      create: {
        userId,
        minimumMatchScore:  dto.minimumMatchScore  ?? 70,
        preferredJobTitles: dto.preferredJobTitles ?? [],
        preferredLocations: dto.preferredLocations ?? [],
        requiredSkills:     dto.requiredSkills     ?? [],
        excludedCompanies:  dto.excludedCompanies  ?? [],
        autoApplyEnabled:   dto.autoApplyEnabled   ?? false,
      },
      update: data,
    });

    logger.info(
      `[settings] updated — userId=${userId} ` +
      `autoApplyEnabled=${settings.autoApplyEnabled} ` +
      `minimumMatchScore=${settings.minimumMatchScore}`,
    );

    return settings;
  }
}

export const settingsService = new SettingsService();
