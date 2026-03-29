import { useEffect, useRef } from 'react';

import { useRecordStore } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';
import { useSettingsStore } from '@/entities/settings';
import { isAutomationUiLockedForPublicStore } from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';

const RUN_THROTTLE_MS = 90_000;

export function useAutoArchiveReadNotes() {
  const isLoaded = useRecordStore((s) => s.isLoaded);
  const load = useRecordStore((s) => s.load);
  const { isProActive } = useProEntitlement();
  const automationLocked = isAutomationUiLockedForPublicStore(isProActive);
  const autoArchiveEnabled = useSettingsStore((s) => s.autoArchiveEnabled);
  const autoArchiveAfterDays = useSettingsStore((s) => s.autoArchiveAfterDays);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const lastRunRef = useRef(0);
  const prevSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isPrivateMode || automationLocked || !autoArchiveEnabled) return;

    const sig = `${autoArchiveEnabled}:${autoArchiveAfterDays}:${automationLocked}`;
    if (prevSigRef.current !== sig) {
      prevSigRef.current = sig;
      lastRunRef.current = 0;
    }

    const now = Date.now();
    if (now - lastRunRef.current < RUN_THROTTLE_MS) return;
    lastRunRef.current = now;

    const threshold = new Date(now - autoArchiveAfterDays * 86_400_000).toISOString();

    void (async () => {
      try {
        const n = await recordRepository.archiveReadRecordsOlderThan(threshold);
        if (n > 0) {
          await load();
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[useAutoArchiveReadNotes]', err);
        }
      }
    })();
  }, [
    aiExecutionMode,
    autoArchiveAfterDays,
    autoArchiveEnabled,
    automationLocked,
    isLoaded,
    isPrivateMode,
    load,
  ]);
}
