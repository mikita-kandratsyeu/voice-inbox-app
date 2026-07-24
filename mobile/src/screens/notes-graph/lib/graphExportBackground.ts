import type { Colors } from '@/shared/config';

export const GRAPH_EXPORT_BACKGROUND_IDS = [
  'white',
  'transparent',
  'blue',
  'lavender',
  'mint',
  'sand',
  'rose',
] as const;

export type GraphExportBackgroundId = (typeof GRAPH_EXPORT_BACKGROUND_IDS)[number];

export const GRAPH_EXPORT_DEFAULT_BACKGROUND_ID = 'white' as const;

export type GraphExportBackgroundStyle = {
  id: GraphExportBackgroundId;
  backgroundColor: string;
  showDots: boolean;
  dotColor: string;
};

type GraphExportBackgroundLabelKey =
  | 'backgroundWhite'
  | 'backgroundTransparent'
  | 'backgroundBlue'
  | 'backgroundLavender'
  | 'backgroundMint'
  | 'backgroundSand'
  | 'backgroundRose';

const LIGHT_EXPORT_COLORS = {
  dot: '#9ca3af',
} as const;

const SOLID_EXPORT_PRESETS: Record<
  GraphExportBackgroundId,
  Pick<GraphExportBackgroundStyle, 'backgroundColor' | 'showDots' | 'dotColor'>
> = {
  white: {
    backgroundColor: '#ffffff',
    showDots: false,
    dotColor: LIGHT_EXPORT_COLORS.dot,
  },
  transparent: {
    backgroundColor: 'transparent',
    showDots: false,
    dotColor: LIGHT_EXPORT_COLORS.dot,
  },
  blue: {
    backgroundColor: '#dbeafe',
    showDots: false,
    dotColor: '#93c5fd',
  },
  lavender: {
    backgroundColor: '#ede9fe',
    showDots: false,
    dotColor: '#c4b5fd',
  },
  mint: {
    backgroundColor: '#d1fae5',
    showDots: false,
    dotColor: '#6ee7b7',
  },
  sand: {
    backgroundColor: '#fef3c7',
    showDots: false,
    dotColor: '#fcd34d',
  },
  rose: {
    backgroundColor: '#ffe4e6',
    showDots: false,
    dotColor: '#fda4af',
  },
};

const GRAPH_EXPORT_BACKGROUND_LABEL_KEYS: Record<
  GraphExportBackgroundId,
  GraphExportBackgroundLabelKey
> = {
  white: 'backgroundWhite',
  transparent: 'backgroundTransparent',
  blue: 'backgroundBlue',
  lavender: 'backgroundLavender',
  mint: 'backgroundMint',
  sand: 'backgroundSand',
  rose: 'backgroundRose',
};

export function isGraphExportBackgroundId(value: string): value is GraphExportBackgroundId {
  return GRAPH_EXPORT_BACKGROUND_IDS.includes(value as GraphExportBackgroundId);
}

export function resolveGraphExportBackground(
  id: GraphExportBackgroundId,
  _color: Colors,
): GraphExportBackgroundStyle {
  return {
    id,
    ...SOLID_EXPORT_PRESETS[id],
  };
}

export function graphExportBackgroundLabelKey(
  id: GraphExportBackgroundId,
): GraphExportBackgroundLabelKey {
  return GRAPH_EXPORT_BACKGROUND_LABEL_KEYS[id];
}
