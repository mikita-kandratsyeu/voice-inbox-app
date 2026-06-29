import { AppState } from 'react-native';

import { shouldReduceMotion } from '@/shared/config/animations';
import { storage } from '@/shared/lib/async-storage';

import {
  DEFAULT_HAPTICS_INTENSITY,
  HAPTICS_INTENSITY_STORAGE_KEY,
  type HapticsIntensity,
  parseHapticsIntensity,
} from './types';

export function getStoredHapticsIntensity(): HapticsIntensity {
  return parseHapticsIntensity(storage.getString(HAPTICS_INTENSITY_STORAGE_KEY));
}

export function getEffectiveHapticsIntensity(): HapticsIntensity {
  if (shouldReduceMotion()) {
    return 'subtle';
  }
  return getStoredHapticsIntensity();
}

export function canPlayHaptic(): boolean {
  return getEffectiveHapticsIntensity() !== 'off' && AppState.currentState === 'active';
}

/** Background-safe haptics (transcription ticks, etc.). */
export function canPlayAmbientHaptic(): boolean {
  return canPlayHaptic();
}

export function isFullHapticsProfile(): boolean {
  return getEffectiveHapticsIntensity() === 'full';
}

export function writeHapticsIntensity(value: HapticsIntensity): void {
  storage.set(HAPTICS_INTENSITY_STORAGE_KEY, value);
}

export function readInitialHapticsIntensity(): HapticsIntensity {
  const stored = storage.getString(HAPTICS_INTENSITY_STORAGE_KEY);
  if (stored == null) {
    return DEFAULT_HAPTICS_INTENSITY;
  }
  return parseHapticsIntensity(stored);
}
