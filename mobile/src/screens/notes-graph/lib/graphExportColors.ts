import type { AccentColorId } from '@/shared/config/accentColors';
import { type Colors, getColors } from '@/shared/config/colors';

import type { GraphExportBackgroundId } from './graphExportBackground';

function polishExportColors(colors: Colors): Colors {
  return {
    ...colors,
    text: {
      ...colors.text,
      secondary: '#64748b',
      muted: '#94a3b8',
    },
    shadow: {
      ...colors.shadow,
      opacity: Math.min(colors.shadow.opacity + 0.05, 0.14),
    },
  };
}

export function resolveGraphExportColors(
  _backgroundId: GraphExportBackgroundId,
  _appColors: Colors,
  accentColorId: AccentColorId,
): Colors {
  return polishExportColors(getColors('light', accentColorId));
}
