import { Settings } from 'react-native-pulsar';

import { diagWarn } from '@/shared/lib/appLogger';

const PRELOAD_PRESET_NAMES = [
  'Ping',
  'Snap',
  'Bloom',
  'Buzz',
  'Charge',
  'Triumph',
  'Breath',
  'Cleave',
  'Lock',
  'Fanfare',
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
    Settings.preloadPresets([...PRELOAD_PRESET_NAMES]);
  } catch (e) {
    diagWarn('[haptics] preload failed', e);
  }
}
