import { AppState } from 'react-native';
import { HapticSupport, Settings } from 'react-native-pulsar';

import { shouldReduceMotion } from '@/shared/config/animations';
import { storage } from '@/shared/lib/async-storage';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';

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
  const intensity = getEffectiveHapticsIntensity();
  const appState = AppState.currentState;
  return intensity !== 'off' && appState === 'active';
}

/** Background-safe haptics (transcription ticks, etc.). */
export function canPlayAmbientHaptic(): boolean {
  return canPlayHaptic();
}

export function isFullHapticsProfile(): boolean {
  return getEffectiveHapticsIntensity() === 'full';
}

/** Rich presets need CoreHaptics; system taps work on more devices and in silent mode. */
export function supportsRichHapticEngine(): boolean {
  try {
    const level = Settings.getHapticsSupportLevel();
    return level >= HapticSupport.STANDARD_SUPPORT;
  } catch {
    return false;
  }
}

export function afterUiReady(run: () => void): void {
  runAfterInteractions(run);
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
