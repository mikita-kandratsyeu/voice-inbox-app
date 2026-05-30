import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { scheduleResumeAllPendingCloudSummarize } from '@/features/ai-processing';
import { localLlmModelDownloader } from '@/features/model-manager/lib/local-llm-download';
import { whisperModelDownloader } from '@/features/model-manager/lib/whisper-download';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import {
  abortTranscriptionForAppBackground,
  releaseWhisperContext,
} from '@/features/transcription';
import { isWhisperNativeWorkActive } from '@/features/transcription/lib/whisperNativeLifecycle';
import { isTranscriptionSessionActive } from '@/features/transcription/model/transcriptionRuntimeRegistry';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { ensurePushRegistered, notifyAppBackground, notifyAppForeground } from '@/shared/lib/push';

const HEARTBEAT_INTERVAL_MS = 40_000;
const HEARTBEAT_THROTTLE_MS = 35_000;
const FOREGROUND_ON_ACTIVE_THROTTLE_MS = 15_000;

const isModelDownloading = (): boolean => {
  const whisperState = whisperModelDownloader.getSnapshot().machineState;
  const llmState = localLlmModelDownloader.getSnapshot().machineState;

  return (
    whisperState === 'downloading' ||
    whisperState === 'pending' ||
    llmState === 'downloading' ||
    llmState === 'pending'
  );
};

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

    const releaseIdleOnDeviceModels = () => {
      if (isTranscriptionSessionActive() || isWhisperNativeWorkActive()) {
        return;
      }

      // Releasing Whisper while Metal is still tearing down after abort causes wsp_ggml_abort.
      if (AppState.currentState !== 'active') {
        return;
      }

      const hasHeavyWork = useRecordStore.getState().hasActiveAiJobs || isModelDownloading();

      if (!hasHeavyWork) {
        releaseWhisperContext().catch(() => {});
        releaseLocalLlmSession().catch(() => {});
      }
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'inactive') {
        void abortTranscriptionForAppBackground();
      }

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
          scheduleResumeAllPendingCloudSummarize();
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
          void abortTranscriptionForAppBackground().finally(releaseIdleOnDeviceModels);
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
