import { Presets } from 'react-native-pulsar';

import { shouldReduceMotion } from '@/shared/config/animations';

import { supportsRichHapticEngine } from './gate';
import type { HapticsIntensity } from './types';

/** Slider preview — plays the target mode directly, ignoring the stored setting. */
export function previewHapticsIntensity(intensity: HapticsIntensity): void {
  if (shouldReduceMotion()) {
    return;
  }

  try {
    switch (intensity) {
      case 'off':
        return;
      case 'subtle':
        Presets.System.impactLight();
        return;
      case 'full':
        if (supportsRichHapticEngine()) {
          Presets.bloom();
        } else {
          Presets.System.impactMedium();
        }
        return;
    }
  } catch {
    try {
      if (intensity === 'full') {
        Presets.System.impactMedium();
      } else if (intensity === 'subtle') {
        Presets.System.selection();
      }
    } catch {
      // ignore preview failures
    }
  }
}
