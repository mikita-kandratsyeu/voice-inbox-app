import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { releaseWhisperContext } from '@/features/transcription';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { ensurePushRegistered, notifyAppBackground, notifyAppForeground } from '@/shared/lib/push';

const HEARTBEAT_INTERVAL_MS = 40_000;
const HEARTBEAT_THROTTLE_MS = 35_000;
const FOREGROUND_ON_ACTIVE_THROTTLE_MS = 15_000;

export function useAppForegroundLifecycle(): void {
  useEffect(() => {
    let foregroundInterval: ReturnType<typeof setInterval> | null = null;
    let lastHeartbeatAt = 0;
    let lastForegroundAt = 0;

    const sendForegroundHeartbeat = () => {
      if (!getHasSeenOnboarding()) return;
      lastHeartbeatAt = Date.now();
      notifyAppForeground();
    };

    const maybeNotifyForeground = () => {
      const isAiProcessing = useRecordStore.getState().hasActiveAiJobs;
      if (!isAiProcessing) return;

      const now = Date.now();
      if (now - lastHeartbeatAt >= HEARTBEAT_THROTTLE_MS) {
        sendForegroundHeartbeat();
      }
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        if (getHasSeenOnboarding()) {
          ensurePushRegistered().catch(() => {});
        }
        const now = Date.now();
        const shouldSendForeground =
          now - lastForegroundAt >= FOREGROUND_ON_ACTIVE_THROTTLE_MS || lastForegroundAt === 0;
        if (shouldSendForeground) {
          lastHeartbeatAt = 0;
          sendForegroundHeartbeat();
          lastForegroundAt = now;
        }
        foregroundInterval = setInterval(maybeNotifyForeground, HEARTBEAT_INTERVAL_MS);
      } else {
        if (foregroundInterval) {
          clearInterval(foregroundInterval);
          foregroundInterval = null;
        }
        if (state === 'background' || state === 'inactive') {
          if (getHasSeenOnboarding()) {
            notifyAppBackground();
          }
          lastForegroundAt = 0;
        }
        if (state === 'background') {
          const hasHeavyWork = useRecordStore.getState().hasActiveAiJobs;

          if (!hasHeavyWork) {
            releaseWhisperContext().catch(() => {});
            releaseLocalLlmSession().catch(() => {});
          }
        }
      }
    };

    handleAppStateChange(AppState.currentState);
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      if (foregroundInterval) clearInterval(foregroundInterval);
      releaseWhisperContext().catch(() => {});
      releaseLocalLlmSession().catch(() => {});
    };
  }, []);
}
