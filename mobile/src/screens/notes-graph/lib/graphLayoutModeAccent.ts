import type { Colors } from '@/shared/config';

import type { GraphLayoutMode } from './graphTypes';

export function getLayoutModeIconAccent(mode: GraphLayoutMode, color: Colors): string {
  switch (mode) {
    case 'cluster':
      return color.accent.models;
    case 'force':
      return color.accent.transcript;
    case 'circular':
      return color.accent.cache;
  }
}
