import type { AccentColorId } from '@/shared/config/accentColors';
import { type Colors, getColors } from '@/shared/config/colors';

import type { GraphExportBackgroundId } from './graphExportBackground';

export type GraphExportNodeColorKey = 'app' | 'light' | 'dark';

const LIGHT_EXPORT_BACKGROUND_IDS = new Set<GraphExportBackgroundId>([
  'white',
  'light',
  'blue',
  'lavender',
  'mint',
  'sand',
  'rose',
]);

const DARK_EXPORT_BACKGROUND_IDS = new Set<GraphExportBackgroundId>(['dark', 'black', 'navy']);

export function getGraphExportNodeColorKey(
  backgroundId: GraphExportBackgroundId,
): GraphExportNodeColorKey {
  if (backgroundId === 'canvas' || backgroundId === 'transparent') {
    return 'app';
  }

  if (LIGHT_EXPORT_BACKGROUND_IDS.has(backgroundId)) {
    return 'light';
  }

  if (DARK_EXPORT_BACKGROUND_IDS.has(backgroundId)) {
    return 'dark';
  }

  return 'app';
}

function polishExportColors(colors: Colors, backgroundId: GraphExportBackgroundId): Colors {
  if (backgroundId === 'black') {
    return {
      ...colors,
      background: {
        ...colors.background,
        card: '#1a1a1a',
      },
      border: {
        default: '#333333',
      },
    };
  }

  if (LIGHT_EXPORT_BACKGROUND_IDS.has(backgroundId)) {
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

  if (DARK_EXPORT_BACKGROUND_IDS.has(backgroundId)) {
    return {
      ...colors,
      text: {
        ...colors.text,
        secondary: '#94a3b8',
        muted: '#64748b',
      },
      border: {
        default: backgroundId === 'navy' ? '#1e293b' : colors.border.default,
      },
    };
  }

  return colors;
}

export function resolveGraphExportColors(
  backgroundId: GraphExportBackgroundId,
  appColors: Colors,
  accentColorId: AccentColorId,
): Colors {
  const colorKey = getGraphExportNodeColorKey(backgroundId);
  if (colorKey === 'app') {
    return appColors;
  }

  const base = getColors(colorKey, accentColorId);
  return polishExportColors(base, backgroundId);
}

export function shouldRecaptureGraphExportForBackground(
  previousBackgroundId: GraphExportBackgroundId,
  nextBackgroundId: GraphExportBackgroundId,
): boolean {
  return (
    getGraphExportNodeColorKey(previousBackgroundId) !==
    getGraphExportNodeColorKey(nextBackgroundId)
  );
}
