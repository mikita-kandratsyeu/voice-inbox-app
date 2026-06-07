import { useEffect } from 'react';

import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { isAutomationUiLockedForPublicStore } from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';

import { diagWarn } from '@/shared/lib/appLogger';

import { runAutoArchiveReadNotesIfEligible } from './runAutoArchiveReadNotesIfEligible';

export function useAutoArchiveReadNotes() {
  const isLoaded = useRecordStore((s) => s.isLoaded);
  const load = useRecordStore((s) => s.load);
  const { isProActive } = useProEntitlement();
  const automationLocked = isAutomationUiLockedForPublicStore(isProActive);
  const autoArchiveEnabled = useSettingsStore((s) => s.autoArchiveEnabled);
  const autoArchiveAfterDays = useSettingsStore((s) => s.autoArchiveAfterDays);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  useEffect(() => {
    if (!isLoaded) return;
    if (isPrivateMode || automationLocked || !autoArchiveEnabled) return;

    void (async () => {
      try {
        const n = await runAutoArchiveReadNotesIfEligible(isProActive);
        if (n > 0) {
          await load();
        }
      } catch (err) {
        diagWarn('[useAutoArchiveReadNotes]', err);
      }
    })();
  }, [
    aiExecutionMode,
    autoArchiveAfterDays,
    autoArchiveEnabled,
    automationLocked,
    isLoaded,
    isPrivateMode,
    isProActive,
    load,
  ]);
}
