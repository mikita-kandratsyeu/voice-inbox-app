import { type AccentColorId, DEFAULT_ACCENT_COLOR_ID, mergeColorsWithAccent } from './accentColors';

export const colors = {
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      card: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#9ca3af',
      muted: '#9ca3af',
    },
    border: {
      default: '#f3f4f6',
    },
    accent: {
      primary: '#3b82f6',
      pin: '#3b82f6',
      unpin: '#f59e0b',
      delete: '#ef4444',
      archive: '#6b7280',
      success: '#34C759',
      transcript: '#8b5cf6',
      cache: '#f59e0b',
      aiData: '#16a34a',
      models: '#0891b2',
    },
    icon: {
      onAccent: '#ffffff',
      muted: '#9ca3af',
    },
    tab: {
      inactive: '#9ca3af',
    },
    onboarding: {
      mic: { color: '#3b82f6', bg: '#dbeafe' },
      lock: { color: '#8b5cf6', bg: '#ede9fe' },
      sparkles: { color: '#f59e0b', bg: '#fef3c7' },
      zap: { color: '#10b981', bg: '#d1fae5' },
      setup: { color: '#6366f1', bg: '#e0e7ff' },
      shield: { color: '#0ea5e9', bg: '#e0f2fe' },
      restore: { color: '#059669', bg: '#d1fae5' },
      privacy: { border: '#c4b5fd', text: '#6d28d9' },
      ai: { border: '#fcd34d', text: '#b45309' },
    },
    status: {
      success: '#22c55e',
      processing: { bg: '#eff6ff', text: '#3b82f6' },
      error: { bg: '#fef2f2', text: '#ef4444' },
      muted: { bg: '#f3f4f6', text: '#9ca3af' },
    },
    shadow: {
      color: '#000000',
      opacity: 0.06,
    },
  },
  dark: {
    background: {
      primary: '#1a1a1a',
      secondary: '#161616',
      tertiary: '#2a2a2a',
      card: '#242424',
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#6b6b6b',
      muted: '#6b7280',
    },
    border: {
      default: '#2e2e2e',
    },
    accent: {
      primary: '#3b82f6',
      pin: '#3b82f6',
      unpin: '#f59e0b',
      delete: '#ef4444',
      archive: '#6b7280',
      success: '#34C759',
      transcript: '#8b5cf6',
      cache: '#f59e0b',
      aiData: '#4ade80',
      models: '#22d3ee',
    },
    icon: {
      onAccent: '#ffffff',
      muted: '#555555',
    },
    tab: {
      inactive: '#4b5563',
    },
    onboarding: {
      mic: { color: '#3b82f6', bg: '#dbeafe' },
      lock: { color: '#8b5cf6', bg: '#ede9fe' },
      sparkles: { color: '#f59e0b', bg: '#fef3c7' },
      zap: { color: '#10b981', bg: '#d1fae5' },
      setup: { color: '#6366f1', bg: '#e0e7ff' },
      shield: { color: '#0ea5e9', bg: '#e0f2fe' },
      restore: { color: '#059669', bg: '#d1fae5' },
      privacy: { border: '#c4b5fd', text: '#6d28d9' },
      ai: { border: '#fcd34d', text: '#b45309' },
    },
    status: {
      success: '#22c55e',
      processing: { bg: '#1e3a5f', text: '#60a5fa' },
      error: { bg: '#450a0a', text: '#f87171' },
      muted: { bg: '#374151', text: '#6b7280' },
    },
    shadow: {
      color: '#000000',
      opacity: 0.3,
    },
  },
} as const;

export type ColorScheme = keyof typeof colors;

export type Colors = {
  background: { primary: string; secondary: string; tertiary: string; card: string };
  text: { primary: string; secondary: string; muted: string };
  border: { default: string };
  accent: {
    primary: string;
    pin: string;
    unpin: string;
    delete: string;
    archive: string;
    success: string;
    transcript: string;
    cache: string;
    aiData: string;
    models: string;
  };
  icon: { onAccent: string; muted: string };
  tab: { inactive: string };
  onboarding: {
    mic: { color: string; bg: string };
    lock: { color: string; bg: string };
    sparkles: { color: string; bg: string };
    zap: { color: string; bg: string };
    setup: { color: string; bg: string };
    shield: { color: string; bg: string };
    restore: { color: string; bg: string };
    privacy: { border: string; text: string };
    ai: { border: string; text: string };
  };
  status: {
    success: string;
    processing: { bg: string; text: string };
    error: { bg: string; text: string };
    muted: { bg: string; text: string };
  };
  shadow: { color: string; opacity: number };
};

export function getColors(
  scheme: ColorScheme,
  accentColorId: AccentColorId = DEFAULT_ACCENT_COLOR_ID,
): Colors {
  const base = colors[scheme] as Colors;
  return mergeColorsWithAccent(base, scheme, accentColorId);
}

export type { AccentColorId } from './accentColors';
export {
  ACCENT_COLOR_IDS,
  ACCENT_COLOR_SWATCHES,
  ACCENT_COLOR_SWATCHES_DEFAULT_FIRST,
  DEFAULT_ACCENT_COLOR_ID,
  getAccentColorSwatches,
  getAccentColorSwatchesCurrentFirst,
  getAccentPreviewHex,
  parseAccentColorId,
} from './accentColors';
