import type { ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';

/** Shared surface chrome for inbox record cards (compact and expanded). */
export function getRecordCardChromeStyle(color: Colors): ViewStyle {
  return {
    backgroundColor: color.background.card,
    borderWidth: 1,
    borderColor: color.border.default,
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
  };
}
