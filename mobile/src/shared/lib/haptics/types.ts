export type HapticsIntensity = 'off' | 'subtle' | 'full';

export const HAPTICS_INTENSITY_STORAGE_KEY = 'settings.hapticsIntensity';

export const DEFAULT_HAPTICS_INTENSITY: HapticsIntensity = 'full';

export function parseHapticsIntensity(raw: string | undefined): HapticsIntensity {
  if (raw === 'off' || raw === 'subtle' || raw === 'full') {
    return raw;
  }
  return DEFAULT_HAPTICS_INTENSITY;
}
