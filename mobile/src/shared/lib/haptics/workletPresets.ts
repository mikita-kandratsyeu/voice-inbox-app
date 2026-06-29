import { Presets } from 'react-native-pulsar';

/** Worklet-safe swipe commit (Full profile feel). */
export function workletHapticSwipeCommit(): void {
  'worklet';
  Presets.cleave();
}

/** Worklet-safe graph drag grab. */
export function workletHapticGraphGrab(): void {
  'worklet';
  Presets.feather();
}

/** Worklet-safe snap / lock feedback. */
export function workletHapticLock(): void {
  'worklet';
  Presets.lock();
}

/** Worklet-safe subtle tap when Full profile unavailable in worklet. */
export function workletHapticLightTap(): void {
  'worklet';
  Presets.System.impactLight();
}
