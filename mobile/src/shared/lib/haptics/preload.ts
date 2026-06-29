import { Presets, Settings } from 'react-native-pulsar';

import { diagWarn } from '@/shared/lib/appLogger';

import { afterUiReady } from './gate';

/** Presets referenced by designSystem (PascalCase for native preload). */
const PRELOAD_PRESET_NAMES = [
  'Ping',
  'Snap',
  'Bloom',
  'Buzz',
  'Blip',
  'Charge',
  'Triumph',
  'Breath',
  'Cleave',
  'Lock',
  'Feather',
  'Swell',
  'Finale',
  'Strike',
  'Latch',
  'Pip',
  'KeyboardMechanical',
] as const;

export function initPulsarHaptics(): void {
  try {
    Settings.enableHaptics(true);
    Settings.enableCache(true);
    Settings.preloadPresets([...PRELOAD_PRESET_NAMES]);
    // Prime CoreHaptics — expressive presets depend on the engine; UIKit taps do not.
    afterUiReady(() => {
      try {
        Presets.ping();
      } catch (e) {
        diagWarn('[haptics] engine warmup failed', e);
      }
    });
  } catch (e) {
    diagWarn('[haptics] preload failed', e);
  }
}
