import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import type { AudioSet, RecordBackType } from 'react-native-nitro-sound';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';

import { useAppLockStore } from '@/entities/app-lock';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';

type AudioRecorderPlayerInstance = {
  addRecordBackListener: (cb: (e: RecordBackType) => void) => void;
  removeRecordBackListener: () => void;
  startRecorder: (uri?: string, audioSets?: AudioSet, meteringEnabled?: boolean) => Promise<string>;
  stopRecorder: () => Promise<string>;
  setSubscriptionDuration: (sec: number) => void;
  pauseRecorder: () => Promise<string>;
  resumeRecorder: () => Promise<string>;
};
import {
  FREE_MAX_RECORDING_MS,
  RECORDING_FINAL_WARNING_REMAINING_MS,
  RECORDING_SOFT_WARNING_REMAINING_MS,
} from '@/features/app-storefront';
import {
  endRecordingLiveActivity,
  startRecordingLiveActivity,
  updateRecordingLiveActivity,
} from '@/features/live-activity-recording';
import {
  ensureRecordingsDir,
  hapticLight,
  hapticMedium,
  IS_IOS,
  RECORDINGS_DIR,
} from '@/shared/lib';
import { checkMicPermission, requestMicPermission } from '@/shared/lib/permissions';

import type { RecordingState } from '../config';

const audioRecorderPlayer = AudioRecorderPlayer as unknown as AudioRecorderPlayerInstance;

const SUBSCRIPTION_DURATION_MS = 200;
const MAX_JUMP_FORWARD_MS = 400;
const MAX_JUMP_BACKWARD_MS = 500;
const IOS_START_POSITION_SUPPRESS_MS = 2800;

/**
 * iOS may report erratic recorder positions when the audio route changes.
 * Clamp jumps so the on-screen timer stays stable; recording itself continues.
 */
function sanitizePosition(rawMs: number, lastValidMs: number, capMs: number): number {
  if (rawMs < 0) {
    return lastValidMs;
  }

  const capped = Math.min(rawMs, capMs);

  if (capped < lastValidMs - MAX_JUMP_BACKWARD_MS) {
    return lastValidMs;
  }

  if (capped > lastValidMs + MAX_JUMP_FORWARD_MS) {
    return lastValidMs + SUBSCRIPTION_DURATION_MS;
  }

  return capped;
}

type UseRecordingOptions = {
  maxRecordingMs?: number;
  onLimitReached?: () => void;
  onRecordingStoppedByAppLock?: (path: string, elapsed: number, elapsedMs: number) => void;
};

export const useRecording = ({
  maxRecordingMs = FREE_MAX_RECORDING_MS,
  onLimitReached,
  onRecordingStoppedByAppLock,
}: UseRecordingOptions = {}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number | undefined>(undefined);

  const audioPathRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const lastValidMsRef = useRef(0);
  const limitReachedRef = useRef(false);
  const softLimitWarningFiredRef = useRef(false);
  const finalLimitWarningFiredRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastLiveActivityDriftSyncRef = useRef(0);
  const LIVE_ACTIVITY_DRIFT_SYNC_MS = 60_000;
  const startPositionSuppressedUntilRef = useRef(0);
  const maxRecordingMsRef = useRef(maxRecordingMs);
  maxRecordingMsRef.current = maxRecordingMs;

  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;
  const onRecordingStoppedByAppLockRef = useRef(onRecordingStoppedByAppLock);
  onRecordingStoppedByAppLockRef.current = onRecordingStoppedByAppLock;
  const stateRef = useRef(state);
  stateRef.current = state;

  const addRecordBackListener = useCallback(() => {
    audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      const cap = maxRecordingMsRef.current;
      const rawMs =
        IS_IOS && Date.now() < startPositionSuppressedUntilRef.current
          ? lastValidMsRef.current + SUBSCRIPTION_DURATION_MS
          : e.currentPosition;
      const ms = sanitizePosition(rawMs, lastValidMsRef.current, cap);
      lastValidMsRef.current = ms;

      const secs = Math.floor(ms / 1000);
      elapsedRef.current = secs;
      elapsedMsRef.current = ms;

      setElapsed(secs);
      setElapsedMs(ms);

      // Update audio level from metering data
      // currentMetering is typically in dB range (e.g., -160 to 0), normalize to 0-1
      if (e.currentMetering !== undefined) {
        const dbValue = e.currentMetering;
        // Normalize from typical dB range (-60 to 0) to 0-1 range
        const normalized = Math.max(0, Math.min(1, (dbValue + 60) / 60));
        setAudioLevel(normalized);
      } else {
        // Fallback if metering is not available
        setAudioLevel(undefined);
      }

      const now = Date.now();
      if (IS_IOS && now - lastLiveActivityDriftSyncRef.current >= LIVE_ACTIVITY_DRIFT_SYNC_MS) {
        lastLiveActivityDriftSyncRef.current = now;
        updateRecordingLiveActivity(secs).catch(() => {});
      }

      const hardCap = maxRecordingMsRef.current;
      const remainingMs = hardCap - ms;

      if (remainingMs <= RECORDING_FINAL_WARNING_REMAINING_MS) {
        if (!finalLimitWarningFiredRef.current) {
          finalLimitWarningFiredRef.current = true;
          hapticMedium();
        }
      } else if (remainingMs <= RECORDING_SOFT_WARNING_REMAINING_MS) {
        if (!softLimitWarningFiredRef.current) {
          softLimitWarningFiredRef.current = true;
          hapticLight();
        }
      }

      if (ms >= hardCap && !limitReachedRef.current) {
        limitReachedRef.current = true;
        endRecordingLiveActivity().catch(() => {});
        audioRecorderPlayer.removeRecordBackListener();
        audioRecorderPlayer
          .stopRecorder()
          .then((result: string) => {
            if (audioPathRef.current === null) {
              audioPathRef.current = result;
            }
            setState('paused');
            Alert.alert(
              t('record.recordStopped'),
              t('record.recordStoppedMessage', {
                maxMinutes: Math.max(1, Math.round(maxRecordingMsRef.current / 60000)),
              }),
              [{ text: t('common.ok') }],
            );
            onLimitReachedRef.current?.();
          })
          .catch(() => {});
      }
    });
  }, [t]);

  const startRecording = useCallback(async () => {
    const status = await checkMicPermission();
    const hasPermission =
      status === 'granted'
        ? true
        : await requestMicPermission({
            title: t('permissions.micTitle'),
            message: t('permissions.micMessage'),
            buttonPositive: t('permissions.allow'),
            buttonNegative: t('permissions.deny'),
          });

    if (!hasPermission) {
      return;
    }

    try {
      limitReachedRef.current = false;
      softLimitWarningFiredRef.current = false;
      finalLimitWarningFiredRef.current = false;
      lastValidMsRef.current = 0;
      audioRecorderPlayer.setSubscriptionDuration(SUBSCRIPTION_DURATION_MS / 1000);

      await ensureRecordingsDir();
      const tempName = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.m4a`;
      const recordPath = `${RECORDINGS_DIR}/${tempName}`;
      let path: string;
      try {
        path = await audioRecorderPlayer.startRecorder(recordPath, RECORDING_AUDIO_SET, true);
      } catch {
        path = await audioRecorderPlayer.startRecorder(undefined, RECORDING_AUDIO_SET, true);
      }
      audioPathRef.current = path;

      startPositionSuppressedUntilRef.current = Date.now() + IOS_START_POSITION_SUPPRESS_MS;
      addRecordBackListener();
      setState('recording');
      hapticLight();

      lastLiveActivityDriftSyncRef.current = Date.now();
      startRecordingLiveActivity().catch(() => {});
    } catch (err) {
      diagWarn('[useRecording] startRecorder failed:', err);
    }
  }, [addRecordBackListener, t]);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      const secs = elapsedRef.current;
      setState('paused');
      setAudioLevel(undefined); // Reset audio level on pause

      updateRecordingLiveActivity(secs, undefined, false).catch(() => {});
    } catch (err) {
      diagWarn('[useRecording] pauseRecorder failed:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      audioRecorderPlayer.setSubscriptionDuration(SUBSCRIPTION_DURATION_MS / 1000);
      await audioRecorderPlayer.resumeRecorder();

      startPositionSuppressedUntilRef.current = Date.now() + IOS_START_POSITION_SUPPRESS_MS;
      addRecordBackListener();
      setState('recording');

      lastLiveActivityDriftSyncRef.current = Date.now();
      updateRecordingLiveActivity(elapsedRef.current, undefined, true).catch(() => {});
    } catch (err) {
      diagWarn('[useRecording] resumeRecorder failed:', err);
    }
  }, [addRecordBackListener]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      endRecordingLiveActivity().catch(() => {});

      audioRecorderPlayer.removeRecordBackListener();

      const result = await audioRecorderPlayer.stopRecorder();

      if (audioPathRef.current === null) {
        audioPathRef.current = result;
      }
      return audioPathRef.current;
    } catch (err) {
      diagWarn('[useRecording] stopRecorder failed:', err);
      return null;
    }
  }, []);

  const discardRecording = useCallback(async () => {
    endRecordingLiveActivity().catch(() => {});
    audioRecorderPlayer.removeRecordBackListener();

    try {
      await audioRecorderPlayer.stopRecorder();
    } catch {
      /* already stopped */
    }

    const path = audioPathRef.current;
    if (path) {
      const clean = path.startsWith('file://') ? path.slice(7) : path;
      try {
        const isExists = await NitroFS.exists(clean);

        if (isExists) {
          await NitroFS.unlink(clean);
        }
      } catch {
        diagWarn('[useRecording] unlink failed:', clean);
      }
    }

    audioPathRef.current = null;
    limitReachedRef.current = false;
    softLimitWarningFiredRef.current = false;
    finalLimitWarningFiredRef.current = false;
    lastValidMsRef.current = 0;
    elapsedRef.current = 0;
    elapsedMsRef.current = 0;
    setElapsed(0);
    setElapsedMs(0);
    setAudioLevel(undefined); // Reset audio level on discard
    setState('idle');
  }, []);

  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (
        IS_IOS &&
        prev === 'background' &&
        next === 'active' &&
        stateRef.current === 'recording'
      ) {
        setElapsed(elapsedRef.current);
        setElapsedMs(elapsedMsRef.current);
      }

      if (
        next === 'background' &&
        isAppLockEnabled &&
        (stateRef.current === 'recording' || stateRef.current === 'paused')
      ) {
        stateRef.current = 'idle';
        stopRecording().then((path) => {
          const cb = onRecordingStoppedByAppLockRef.current;
          if (path && cb) {
            cb(path, elapsedRef.current, elapsedMsRef.current);
          }
        });
      }
    });
    return () => sub.remove();
  }, [isAppLockEnabled, stopRecording]);

  useEffect(() => {
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      endRecordingLiveActivity().catch(() => {});
      audioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  return {
    state,
    elapsed,
    elapsedMs,
    audioLevel,
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  };
};

const RECORDING_AUDIO_SET = {
  AVModeIOS: 'measurement',
  AVFormatIDKeyIOS: 'lpcm',
  AVSampleRateKeyIOS: 16000,
  AVNumberOfChannelsKeyIOS: 1,
  AudioSourceAndroid: AudioSourceAndroidType.VOICE_RECOGNITION,
  OutputFormatAndroid: OutputFormatAndroidType.DEFAULT,
  AudioEncoderAndroid: AudioEncoderAndroidType.DEFAULT,
  AudioSamplingRate: 16000,
  AudioChannels: 1,
  AudioEncodingBitRate: 256000,
} as AudioSet;
