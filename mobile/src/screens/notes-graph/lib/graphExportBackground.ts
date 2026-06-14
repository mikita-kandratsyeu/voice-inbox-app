import type { Colors } from '@/shared/config';

export const GRAPH_EXPORT_BACKGROUND_IDS = [
  'canvas',
  'white',
  'light',
  'dark',
  'black',
  'blue',
  'lavender',
  'mint',
  'sand',
  'rose',
  'navy',
  'transparent',
] as const;

export type GraphExportBackgroundId = (typeof GRAPH_EXPORT_BACKGROUND_IDS)[number];

export const GRAPH_EXPORT_CANVAS_BACKGROUND_ID = 'canvas' as const;

export const GRAPH_EXPORT_COLOR_BACKGROUND_IDS = GRAPH_EXPORT_BACKGROUND_IDS.filter(
  (id): id is Exclude<GraphExportBackgroundId, typeof GRAPH_EXPORT_CANVAS_BACKGROUND_ID> =>
    id !== GRAPH_EXPORT_CANVAS_BACKGROUND_ID,
);

export type GraphExportBackgroundStyle = {
  id: GraphExportBackgroundId;
  backgroundColor: string;
  showDots: boolean;
  dotColor: string;
};

type GraphExportBackgroundLabelKey =
  | 'backgroundCanvas'
  | 'backgroundWhite'
  | 'backgroundLight'
  | 'backgroundDark'
  | 'backgroundBlack'
  | 'backgroundBlue'
  | 'backgroundLavender'
  | 'backgroundMint'
  | 'backgroundSand'
  | 'backgroundRose'
  | 'backgroundNavy'
  | 'backgroundTransparent';

const LIGHT_EXPORT_COLORS = {
  secondary: '#f9fafb',
  dot: '#9ca3af',
} as const;

const DARK_EXPORT_COLORS = {
  secondary: '#161616',
  dot: '#6b7280',
} as const;

const SOLID_EXPORT_PRESETS: Record<
  Exclude<GraphExportBackgroundId, 'canvas' | 'transparent'>,
  Pick<GraphExportBackgroundStyle, 'backgroundColor' | 'showDots' | 'dotColor'>
> = {
  white: {
    backgroundColor: '#ffffff',
    showDots: false,
    dotColor: LIGHT_EXPORT_COLORS.dot,
  },
  light: {
    backgroundColor: LIGHT_EXPORT_COLORS.secondary,
    showDots: true,
    dotColor: LIGHT_EXPORT_COLORS.dot,
  },
  dark: {
    backgroundColor: DARK_EXPORT_COLORS.secondary,
    showDots: true,
    dotColor: DARK_EXPORT_COLORS.dot,
  },
  black: {
    backgroundColor: '#000000',
    showDots: true,
    dotColor: '#404040',
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
  navy: {
    backgroundColor: '#0f172a',
    showDots: true,
    dotColor: '#334155',
  },
};

const GRAPH_EXPORT_BACKGROUND_LABEL_KEYS: Record<
  GraphExportBackgroundId,
  GraphExportBackgroundLabelKey
> = {
  canvas: 'backgroundCanvas',
  white: 'backgroundWhite',
  light: 'backgroundLight',
  dark: 'backgroundDark',
  black: 'backgroundBlack',
  blue: 'backgroundBlue',
  lavender: 'backgroundLavender',
  mint: 'backgroundMint',
  sand: 'backgroundSand',
  rose: 'backgroundRose',
  navy: 'backgroundNavy',
  transparent: 'backgroundTransparent',
};

export function isGraphExportBackgroundId(value: string): value is GraphExportBackgroundId {
  return GRAPH_EXPORT_BACKGROUND_IDS.includes(value as GraphExportBackgroundId);
}

export function resolveGraphExportBackground(
  id: GraphExportBackgroundId,
  color: Colors,
): GraphExportBackgroundStyle {
  if (id === 'canvas') {
    return {
      id,
      backgroundColor: color.background.secondary,
      showDots: true,
      dotColor: color.text.muted,
    };
  }

  if (id === 'transparent') {
    return {
      id,
      backgroundColor: 'transparent',
      showDots: false,
      dotColor: color.text.muted,
    };
  }

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
