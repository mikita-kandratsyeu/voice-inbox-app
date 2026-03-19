import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import type { AudioSet, RecordBackType } from 'react-native-audio-recorder-player';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

import { useAppLockStore } from '@/entities/app-lock';

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
  endRecordingLiveActivity,
  startRecordingLiveActivity,
  updateRecordingLiveActivity,
} from '@/features/live-activity-recording';
import { ensureRecordingsDir, hapticLight, IS_IOS, RECORDINGS_DIR } from '@/shared/lib';
import { checkMicPermission, requestMicPermission } from '@/shared/lib/permissions';

import type { RecordingState } from '../config';
import { MAX_RECORDING_MS } from '../config';

const audioRecorderPlayer = AudioRecorderPlayer as unknown as AudioRecorderPlayerInstance;

const SUBSCRIPTION_DURATION_MS = 200;
const MAX_JUMP_FORWARD_MS = 400;
const MAX_JUMP_BACKWARD_MS = 500;

type SanitizeResult = { ms: number; routeChanged: boolean };

function sanitizePosition(rawMs: number, lastValidMs: number): SanitizeResult {
  if (rawMs < 0) {
    return { ms: lastValidMs, routeChanged: false };
  }

  const capped = Math.min(rawMs, MAX_RECORDING_MS);

  if (capped < lastValidMs - MAX_JUMP_BACKWARD_MS) {
    return { ms: lastValidMs, routeChanged: true };
  }

  if (capped > lastValidMs + MAX_JUMP_FORWARD_MS) {
    return { ms: lastValidMs + SUBSCRIPTION_DURATION_MS, routeChanged: true };
  }

  return { ms: capped, routeChanged: false };
}

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

type UseRecordingOptions = {
  onLimitReached?: () => void;
  onRecordingStoppedByAppLock?: (path: string, elapsed: number, elapsedMs: number) => void;
  onAudioRouteChange?: () => void;
};

export const useRecording = ({
  onLimitReached,
  onRecordingStoppedByAppLock,
  onAudioRouteChange,
}: UseRecordingOptions = {}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const audioPathRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const lastValidMsRef = useRef(0);
  const limitReachedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastLiveActivityUpdateRef = useRef(0);

  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;
  const onRecordingStoppedByAppLockRef = useRef(onRecordingStoppedByAppLock);
  onRecordingStoppedByAppLockRef.current = onRecordingStoppedByAppLock;
  const onAudioRouteChangeRef = useRef(onAudioRouteChange);
  onAudioRouteChangeRef.current = onAudioRouteChange;
  const stateRef = useRef(state);
  stateRef.current = state;

  const addRecordBackListener = useCallback(() => {
    audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      const { ms, routeChanged } = sanitizePosition(e.currentPosition, lastValidMsRef.current);
      lastValidMsRef.current = ms;

      if (routeChanged && IS_IOS) {
        const secs = Math.floor(ms / 1000);
        elapsedRef.current = secs;
        elapsedMsRef.current = ms;
        setElapsed(secs);
        setElapsedMs(ms);

        audioRecorderPlayer.removeRecordBackListener();
        audioRecorderPlayer
          .pauseRecorder()
          .then((result: string) => {
            if (audioPathRef.current === null) {
              audioPathRef.current = result;
            }

            setState('paused');
            onAudioRouteChangeRef.current?.();
          })
          .catch(() => {});
        return;
      }

      const secs = Math.floor(ms / 1000);
      const isBackground = IS_IOS && appStateRef.current === 'background';

      elapsedRef.current = secs;
      elapsedMsRef.current = ms;

      if (!isBackground) {
        setElapsed(secs);
        setElapsedMs(ms);
      } else {
        const now = Date.now();

        if (now - lastLiveActivityUpdateRef.current >= 1000) {
          lastLiveActivityUpdateRef.current = now;
          updateRecordingLiveActivity(secs).catch(() => {});
        }
      }

      if (ms >= MAX_RECORDING_MS && !limitReachedRef.current) {
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
            Alert.alert(t('record.recordStopped'), t('record.recordStoppedMessage'), [
              { text: 'OK' },
            ]);
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

      addRecordBackListener();
      setState('recording');
      hapticLight();

      startRecordingLiveActivity().catch(() => {});
    } catch (err) {
      if (__DEV__) console.warn('[useRecording] startRecorder failed:', err);
    }
  }, [addRecordBackListener, t]);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setState('paused');
    } catch (err) {
      if (__DEV__) console.warn('[useRecording] pauseRecorder failed:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      audioRecorderPlayer.setSubscriptionDuration(SUBSCRIPTION_DURATION_MS / 1000);
      await audioRecorderPlayer.resumeRecorder();

      addRecordBackListener();
      setState('recording');
    } catch (err) {
      if (__DEV__) console.warn('[useRecording] resumeRecorder failed:', err);
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
      if (__DEV__) console.warn('[useRecording] stopRecorder failed:', err);
      return null;
    }
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
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
};
