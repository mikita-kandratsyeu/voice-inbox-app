import { useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, type NativeModule, NativeModules } from 'react-native';

import { hapticLight, IS_IOS } from '@/shared/lib';

const AudioRouteModule = NativeModules.AudioRouteModule as NativeModule | undefined;

const ROUTE_HINT_VISIBLE_MS = 4000;

/** Brief non-blocking hint when iOS reports a real mic route change during recording. */
export function useRecordingAudioRouteHint(isRecording: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!IS_IOS || !isRecording || !AudioRouteModule) {
      return;
    }

    const emitter = new NativeEventEmitter(AudioRouteModule);
    const sub = emitter.addListener('audioRouteChanged', () => {
      hapticLight();
      setVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(() => setVisible(false), ROUTE_HINT_VISIBLE_MS);
    });

    return () => {
      sub.remove();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setVisible(false);
    };
  }, [isRecording]);

  return visible;
}
