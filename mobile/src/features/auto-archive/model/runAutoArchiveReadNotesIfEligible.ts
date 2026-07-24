import dayjs from 'dayjs';

import { recordRepository } from '@/entities/record/model/repository';
import { useSettingsStore } from '@/entities/settings';
import { isAutomationUiLockedForPublicStore } from '@/features/app-storefront';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { diagWarn } from '@/shared/lib/appLogger';

const COOLDOWN_MS = 90_000;

let lastRunAtMs = 0;
let lastSettingsSig = '';

export type RunAutoArchiveOptions = {
  skipCooldown?: boolean;
};

export async function runAutoArchiveReadNotesIfEligible(
  isProActive?: boolean,
  options?: RunAutoArchiveOptions,
): Promise<number> {
  const pro = isProActive ?? isProActiveFromStorageSync();
  const automationLocked = isAutomationUiLockedForPublicStore(pro);
  const { autoArchiveEnabled, autoArchiveAfterDays, aiExecutionMode } = useSettingsStore.getState();
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  const sig = `${autoArchiveEnabled}:${autoArchiveAfterDays}:${automationLocked}:${isPrivateMode}`;

  if (sig !== lastSettingsSig) {
    lastSettingsSig = sig;
    lastRunAtMs = 0;
  }

  if (isPrivateMode || automationLocked || !autoArchiveEnabled) {
    return 0;
  }

  const now = Date.now();
  if (!options?.skipCooldown && now - lastRunAtMs < COOLDOWN_MS) {
    return 0;
  }

  lastRunAtMs = now;

  const threshold = dayjs(now).subtract(autoArchiveAfterDays, 'day').toISOString();
  try {
    return await recordRepository.archiveReadRecordsOlderThan(threshold);
  } catch (err) {
    diagWarn('[runAutoArchiveReadNotesIfEligible]', err);
    return 0;
  }
}
