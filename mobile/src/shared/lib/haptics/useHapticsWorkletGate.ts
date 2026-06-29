import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useSettingsStore } from '@/entities/settings';

import { getEffectiveHapticsIntensity } from './gate';

/** Sync haptics intensity into Reanimated shared values for gesture worklets. */
export function useHapticsWorkletGate() {
  const hapticsIntensity = useSettingsStore((s) => s.hapticsIntensity);
  const enabled = useSharedValue(getEffectiveHapticsIntensity() !== 'off');
  const fullProfile = useSharedValue(getEffectiveHapticsIntensity() === 'full');

  useEffect(() => {
    const sync = () => {
      const intensity = getEffectiveHapticsIntensity();
      enabled.value = intensity !== 'off';
      fullProfile.value = intensity === 'full';
    };

    sync();
    const appStateSub = AppState.addEventListener('change', sync);
    return () => appStateSub.remove();
  }, [enabled, fullProfile, hapticsIntensity]);

  return { enabled, fullProfile };
}
