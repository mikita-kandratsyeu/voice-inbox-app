import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, type AppStateStatus, Platform } from 'react-native';
import Sound, {
  type AudioSet,
  type RecordBackType,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-nitro-sound';

import { useAppLockStore } from '@/entities/app-lock';
import {
  startRecordingBackgroundService,
  stopRecordingBackgroundService,
} from '@/features/background-recording';
import {
  endRecordingLiveActivity,
  startRecordingLiveActivity,
  updateRecordingLiveActivity,
} from '@/features/live-activity-recording';
import { hapticLight } from '@/shared/lib';

import type { RecordingState } from '../config';
import { MAX_RECORDING_MS } from '../config';
import { requestMicPermission } from '../lib/requestMicPermission';

const audioRecorderPlayer = Sound;

const RECORDING_AUDIO_SET: AudioSet = {
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
};

type UseRecordingOptions = {
  onLimitReached?: () => void;
  onRecordingStoppedByAppLock?: (path: string, elapsed: number, elapsedMs: number) => void;
};

export const useRecording = ({
  onLimitReached,
  onRecordingStoppedByAppLock,
}: UseRecordingOptions = {}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const audioPathRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const limitReachedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastLiveActivityUpdateRef = useRef(0);

  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;
  const onRecordingStoppedByAppLockRef = useRef(onRecordingStoppedByAppLock);
  onRecordingStoppedByAppLockRef.current = onRecordingStoppedByAppLock;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        Platform.OS === 'ios' &&
        prev === 'background' &&
        next === 'active' &&
        stateRef.current === 'recording'
      ) {
        setElapsed(elapsedRef.current);
        setElapsedMs(elapsedMsRef.current);
      }
    });
    return () => sub.remove();
  }, []);

  const addRecordBackListener = useCallback(() => {
    audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      const ms = e.currentPosition;
      const secs = Math.floor(ms / 1000);
      const isBackground = Platform.OS === 'ios' && appStateRef.current === 'background';

      elapsedRef.current = secs;
      elapsedMsRef.current = ms;

      if (!isBackground) {
        setElapsed(secs);
        setElapsedMs(ms);
        updateRecordingLiveActivity(secs).catch(() => {});
      } else {
        const now = Date.now();
        if (now - lastLiveActivityUpdateRef.current >= 5000) {
          lastLiveActivityUpdateRef.current = now;
          updateRecordingLiveActivity(secs).catch(() => {});
        }
      }

      if (ms >= MAX_RECORDING_MS && !limitReachedRef.current) {
        limitReachedRef.current = true;
        if (Platform.OS === 'android') {
          stopRecordingBackgroundService().catch(() => {});
        }
        endRecordingLiveActivity().catch(() => {});
        audioRecorderPlayer.removeRecordBackListener();
        audioRecorderPlayer
          .stopRecorder()
          .then((result) => {
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
    const hasPermission = await requestMicPermission();

    if (!hasPermission) {
      return;
    }

    try {
      limitReachedRef.current = false;
      audioRecorderPlayer.setSubscriptionDuration(0.2);

      const path = await audioRecorderPlayer.startRecorder(undefined, RECORDING_AUDIO_SET, true);
      audioPathRef.current = path;

      addRecordBackListener();
      setState('recording');
      hapticLight();

      if (Platform.OS === 'android') {
        startRecordingBackgroundService().catch(() => {});
      }
      startRecordingLiveActivity().catch(() => {});
    } catch (err) {
      if (__DEV__) console.warn('[useRecording] startRecorder failed:', err);
    }
  }, [addRecordBackListener]);

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
      audioRecorderPlayer.setSubscriptionDuration(0.2);
      await audioRecorderPlayer.resumeRecorder();

      addRecordBackListener();
      setState('recording');
    } catch (err) {
      if (__DEV__) console.warn('[useRecording] resumeRecorder failed:', err);
    }
  }, [addRecordBackListener]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'android') {
        stopRecordingBackgroundService().catch(() => {});
      }
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
      if (Platform.OS === 'android') {
        stopRecordingBackgroundService().catch(() => {});
      }
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
