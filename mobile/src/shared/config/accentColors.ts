import type { Colors, ColorScheme } from './colors';

export const DEFAULT_ACCENT_COLOR_ID = 'default' as const;

export const ACCENT_COLOR_IDS = [
  DEFAULT_ACCENT_COLOR_ID,
  'indigo',
  'violet',
  'fuchsia',
  'rose',
  'orange',
  'amber',
  'emerald',
  'cyan',
] as const;

export type AccentColorId = (typeof ACCENT_COLOR_IDS)[number];

type SchemePatch = { primary: string; processingBg: string; processingText: string };

const ACCENT_PATCHES: Record<
  Exclude<AccentColorId, 'default'>,
  { light: SchemePatch; dark: SchemePatch }
> = {
  indigo: {
    light: { primary: '#6366f1', processingBg: '#eef2ff', processingText: '#4f46e5' },
    dark: { primary: '#6366f1', processingBg: '#312e81', processingText: '#a5b4fc' },
  },
  violet: {
    light: { primary: '#8b5cf6', processingBg: '#f5f3ff', processingText: '#6d28d9' },
    dark: { primary: '#8b5cf6', processingBg: '#2e1065', processingText: '#c4b5fd' },
  },
  fuchsia: {
    light: { primary: '#c026d3', processingBg: '#fdf4ff', processingText: '#86198f' },
    dark: { primary: '#e879f9', processingBg: '#4a044e', processingText: '#f0abfc' },
  },
  rose: {
    light: { primary: '#f43f5e', processingBg: '#fff1f2', processingText: '#e11d48' },
    dark: { primary: '#f43f5e', processingBg: '#4c0519', processingText: '#fb7185' },
  },
  orange: {
    light: { primary: '#ea580c', processingBg: '#fff7ed', processingText: '#9a3412' },
    dark: { primary: '#fb923c', processingBg: '#7c2d12', processingText: '#fdba74' },
  },
  amber: {
    light: { primary: '#d97706', processingBg: '#fffbeb', processingText: '#92400e' },
    dark: { primary: '#fbbf24', processingBg: '#422006', processingText: '#fde68a' },
  },
  emerald: {
    light: { primary: '#10b981', processingBg: '#ecfdf5', processingText: '#047857' },
    dark: { primary: '#10b981', processingBg: '#022c22', processingText: '#6ee7b7' },
  },
  cyan: {
    light: { primary: '#06b6d4', processingBg: '#ecfeff', processingText: '#0e7490' },
    dark: { primary: '#06b6d4', processingBg: '#083344', processingText: '#67e8f9' },
  },
};

/** Swatch shown in picker (light-theme primary; “default” matches built-in blue). */
export const ACCENT_COLOR_SWATCHES: { id: AccentColorId; previewHex: string }[] = [
  { id: 'default', previewHex: '#3b82f6' },
  { id: 'indigo', previewHex: '#6366f1' },
  { id: 'violet', previewHex: '#8b5cf6' },
  { id: 'fuchsia', previewHex: '#c026d3' },
  { id: 'rose', previewHex: '#f43f5e' },
  { id: 'orange', previewHex: '#ea580c' },
  { id: 'amber', previewHex: '#d97706' },
  { id: 'emerald', previewHex: '#10b981' },
  { id: 'cyan', previewHex: '#06b6d4' },
];

export function parseAccentColorId(raw: string | undefined | null): AccentColorId {
  if (raw && (ACCENT_COLOR_IDS as readonly string[]).includes(raw)) {
    return raw as AccentColorId;
  }
  return DEFAULT_ACCENT_COLOR_ID;
}

export function mergeColorsWithAccent(
  base: Colors,
  scheme: ColorScheme,
  accentId: AccentColorId,
): Colors {
  if (accentId === DEFAULT_ACCENT_COLOR_ID) {
    return base;
  }
  const entry = ACCENT_PATCHES[accentId];
  if (!entry) {
    return base;
  }
  const patch = scheme === 'dark' ? entry.dark : entry.light;
  return {
    ...base,
    accent: {
      ...base.accent,
      primary: patch.primary,
      pin: patch.primary,
    },
    status: {
      ...base.status,
      processing: {
        bg: patch.processingBg,
        text: patch.processingText,
      },
    },
  };
}
