import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordBackType } from 'react-native-audio-recorder-player';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

import type { RecordingState } from '../config';
import { requestMicPermission } from '../lib/requestMicPermission';

const audioRecorderPlayer = AudioRecorderPlayer;

export const useRecording = () => {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [meterLevel, setMeterLevel] = useState<number | undefined>(undefined);

  const audioPathRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);

  const addRecordBackListener = useCallback(() => {
    audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      const secs = Math.floor(e.currentPosition / 1000);
      elapsedRef.current = secs;
      setElapsed(secs);

      if (e.currentMetering !== undefined) {
        setMeterLevel(e.currentMetering);
      }
    });
  }, []);

  const startRecording = useCallback(async () => {
    const hasPermission = await requestMicPermission();

    if (!hasPermission) {
      return;
    }

    try {
      audioRecorderPlayer.setSubscriptionDuration(0.1);

      const path = await audioRecorderPlayer.startRecorder(undefined, undefined, true);
      audioPathRef.current = path;

      addRecordBackListener();
      setState('recording');
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
      audioRecorderPlayer.setSubscriptionDuration(0.1);
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
    meterLevel,
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
};
