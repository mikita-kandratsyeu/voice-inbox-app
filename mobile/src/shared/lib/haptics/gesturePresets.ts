import { Presets } from 'react-native-pulsar';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Pulsar Presets are worklet-safe (see react-native-pulsar Presets.ts).
 * Intensity must come from shared values — never read settings/storage in worklets.
 */
export function playGestureSwipeHaptic(
  enabled: SharedValue<boolean>,
  fullProfile: SharedValue<boolean>,
): void {
  'worklet';
  if (!enabled.value) {
    return;
  }
  if (fullProfile.value) {
    Presets.cleave();
    return;
  }
  Presets.System.impactLight();
}

export function playGestureGraphGrabHaptic(
  enabled: SharedValue<boolean>,
  fullProfile: SharedValue<boolean>,
): void {
  'worklet';
  if (!enabled.value) {
    return;
  }
  if (fullProfile.value) {
    Presets.feather();
    return;
  }
  Presets.System.impactLight();
}

export function playGestureGraphLockHaptic(
  enabled: SharedValue<boolean>,
  fullProfile: SharedValue<boolean>,
): void {
  'worklet';
  if (!enabled.value || !fullProfile.value) {
    return;
  }
  Presets.lock();
}
