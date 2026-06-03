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
      privateSlide: { color: '#0d9488', bg: '#ccfbf1', chipBorder: '#5eead4', chipText: '#115e59' },
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
      privateSlide: {
        color: '#2dd4bf',
        bg: '#134e4a',
        chipBorder: '#0d9488',
        chipText: '#ccfbf1',
      },
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

export const privateModeColors: Colors = {
  background: {
    primary: '#070b12',
    secondary: '#0a1019',
    tertiary: '#121a28',
    card: '#0f1622',
  },
  text: {
    primary: '#d9e7ff',
    secondary: '#8ca1c2',
    muted: '#6f82a0',
  },
  border: {
    default: '#1a2740',
  },
  accent: {
    primary: '#4da3ff',
    pin: '#6bb6ff',
    unpin: '#f0b45b',
    delete: '#ff6b7a',
    archive: '#7788a6',
    success: '#3ad18b',
    transcript: '#7f8cff',
    cache: '#f0b45b',
    aiData: '#45d6a2',
    models: '#67c6ff',
  },
  icon: {
    onAccent: '#ffffff',
    muted: '#5f7394',
  },
  tab: {
    inactive: '#5d7090',
  },
  onboarding: {
    mic: { color: '#4da3ff', bg: '#11233d' },
    lock: { color: '#8f9dff', bg: '#1b2248' },
    sparkles: { color: '#f0b45b', bg: '#362711' },
    zap: { color: '#3ad18b', bg: '#0f2e24' },
    setup: { color: '#7f8cff', bg: '#1a2148' },
    shield: { color: '#67c6ff', bg: '#102b3b' },
    restore: { color: '#45d6a2', bg: '#123127' },
    privateSlide: {
      color: '#5eead4',
      bg: '#0f2c2a',
      chipBorder: '#2dd4bf',
      chipText: '#ecfdfa',
    },
    privacy: { border: '#3b6aa1', text: '#8ebdff' },
    ai: { border: '#7f8cff', text: '#b7beff' },
  },
  status: {
    success: '#3ad18b',
    processing: { bg: '#143053', text: '#6bb6ff' },
    error: { bg: '#4a1d29', text: '#ff9aa5' },
    muted: { bg: '#1a2740', text: '#8ca1c2' },
  },
  shadow: {
    color: '#000000',
    opacity: 0.45,
  },
};

/** Private mode + custom OpenAI-compatible server (cyan/sky — distinct from on-device blue). */
export const customServerModeColors: Colors = {
  background: {
    primary: '#080c10',
    secondary: '#0a1218',
    tertiary: '#151d28',
    card: '#101822',
  },
  text: {
    primary: '#e8f4ff',
    secondary: '#94b8d4',
    muted: '#7399b5',
  },
  border: {
    default: '#1e3348',
  },
  accent: {
    primary: '#38bdf8',
    pin: '#7dd3fc',
    unpin: '#f0b45b',
    delete: '#ff6b7a',
    archive: '#8aa3b8',
    success: '#3ad18b',
    transcript: '#7dd3fc',
    cache: '#f0b45b',
    aiData: '#22d3ee',
    models: '#67e8f9',
  },
  icon: {
    onAccent: '#ffffff',
    muted: '#6d8faa',
  },
  tab: {
    inactive: '#6b8fa8',
  },
  onboarding: {
    mic: { color: '#38bdf8', bg: '#112233' },
    lock: { color: '#7dd3fc', bg: '#152a3d' },
    sparkles: { color: '#f0b45b', bg: '#362711' },
    zap: { color: '#3ad18b', bg: '#0f2e24' },
    setup: { color: '#7dd3fc', bg: '#112233' },
    shield: { color: '#7dd3fc', bg: '#112233' },
    restore: { color: '#22d3ee', bg: '#0f2838' },
    privateSlide: {
      color: '#7dd3fc',
      bg: '#112233',
      chipBorder: '#38bdf8',
      chipText: '#e8f4ff',
    },
    privacy: { border: '#3b6a8f', text: '#9fd4ff' },
    ai: { border: '#4d8fb8', text: '#c8e7ff' },
  },
  status: {
    success: '#3ad18b',
    processing: { bg: '#112233', text: '#7dd3fc' },
    error: { bg: '#4a1d29', text: '#ff9aa5' },
    muted: { bg: '#1a2a3d', text: '#94b8d4' },
  },
  shadow: {
    color: '#000000',
    opacity: 0.45,
  },
};

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
    privateSlide: { color: string; bg: string; chipBorder: string; chipText: string };
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
