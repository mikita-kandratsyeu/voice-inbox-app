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
      success: '#34C759',
      transcript: '#8b5cf6',
      cache: '#f59e0b',
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
      privacy: { border: '#c4b5fd', text: '#6d28d9' },
      ai: { border: '#fcd34d', text: '#b45309' },
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
      success: '#34C759',
      transcript: '#8b5cf6',
      cache: '#f59e0b',
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
      privacy: { border: '#c4b5fd', text: '#6d28d9' },
      ai: { border: '#fcd34d', text: '#b45309' },
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
    success: string;
    transcript: string;
    cache: string;
  };
  icon: { onAccent: string; muted: string };
  tab: { inactive: string };
  onboarding: {
    mic: { color: string; bg: string };
    lock: { color: string; bg: string };
    sparkles: { color: string; bg: string };
    zap: { color: string; bg: string };
    privacy: { border: string; text: string };
    ai: { border: string; text: string };
  };
  shadow: { color: string; opacity: number };
};

export const getColors = (scheme: ColorScheme): Colors => colors[scheme] as Colors;
