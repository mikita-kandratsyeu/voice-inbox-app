import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import type { AudioSet, RecordBackType } from 'react-native-audio-recorder-player';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

import { hapticLight } from '@/shared/lib';

import type { RecordingState } from '../config';
import { MAX_RECORDING_MS } from '../config';
import { requestMicPermission } from '../lib/requestMicPermission';

const audioRecorderPlayer = AudioRecorderPlayer;

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
};

export const useRecording = ({ onLimitReached }: UseRecordingOptions = {}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [meterLevel, setMeterLevel] = useState<number | undefined>(undefined);

  const audioPathRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const limitReachedRef = useRef(false);

  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;

  const addRecordBackListener = useCallback(() => {
    audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      const ms = e.currentPosition;
      const secs = Math.floor(ms / 1000);

      if (secs !== elapsedRef.current) {
        elapsedRef.current = secs;
        setElapsed(secs);
      }
      setElapsedMs(ms);

      if (e.currentMetering !== undefined) {
        setMeterLevel(e.currentMetering);
      }

      if (ms >= MAX_RECORDING_MS && !limitReachedRef.current) {
        limitReachedRef.current = true;
        audioRecorderPlayer.removeRecordBackListener();
        setMeterLevel(undefined);
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
      audioRecorderPlayer.setSubscriptionDuration(0.05);

      const path = await audioRecorderPlayer.startRecorder(undefined, RECORDING_AUDIO_SET, true);
      audioPathRef.current = path;

      addRecordBackListener();
      setState('recording');
      hapticLight();
    } catch (err) {
      console.warn('[useRecording] startRecorder failed:', err);
    }
  }, [addRecordBackListener]);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorderPlayer.pauseRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      setMeterLevel(undefined);
      setState('paused');
    } catch (err) {
      console.warn('[useRecording] pauseRecorder failed:', err);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      audioRecorderPlayer.setSubscriptionDuration(0.05);
      await audioRecorderPlayer.resumeRecorder();

      addRecordBackListener();
      setState('recording');
    } catch (err) {
      console.warn('[useRecording] resumeRecorder failed:', err);
    }
  }, [addRecordBackListener]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      audioRecorderPlayer.removeRecordBackListener();
      setMeterLevel(undefined);

      const result = await audioRecorderPlayer.stopRecorder();

      if (audioPathRef.current === null) {
        audioPathRef.current = result;
      }
      return audioPathRef.current;
    } catch (err) {
      console.warn('[useRecording] stopRecorder failed:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.stopRecorder().catch(() => {});
    };
  }, []);

  return {
    state,
    elapsed,
    elapsedMs,
    meterLevel,
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
};
