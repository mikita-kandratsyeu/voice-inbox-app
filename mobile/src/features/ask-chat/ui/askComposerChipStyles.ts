import type { ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';

/** Flat pill surface for chips in the Ask AI composer bottom toolbar. */
export function getAskComposerChipSurfaceStyle(color: Colors): ViewStyle {
  return {
    backgroundColor: color.background.tertiary,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  };
}
