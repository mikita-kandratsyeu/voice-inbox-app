import type { Colors } from '@/shared/config';

const SLIDE_CONTENT = [
  {
    id: 'record',
    titleKey: 'onboarding.recordTitle' as const,
    descKey: 'onboarding.recordDesc' as const,
    iconName: 'Mic' as const,
    extra: 'dots' as const,
  },
  {
    id: 'transcribe',
    titleKey: 'onboarding.transcribeTitle' as const,
    descKey: 'onboarding.transcribeDesc' as const,
    iconName: 'Lock' as const,
    extra: 'privacy' as const,
  },
  {
    id: 'ai',
    titleKey: 'onboarding.aiTitle' as const,
    descKey: 'onboarding.aiDesc' as const,
    iconName: 'Sparkles' as const,
    extra: 'ai-features' as const,
  },
  {
    id: 'ready',
    titleKey: 'onboarding.readyTitle' as const,
    descKey: 'onboarding.readyDesc' as const,
    iconName: 'Zap' as const,
    extra: 'check' as const,
  },
  {
    id: 'setup',
    titleKey: 'onboarding.setupAiTitle' as const,
    descKey: 'onboarding.setupAiDesc' as const,
    iconName: 'Settings' as const,
    extra: 'setup' as const,
  },
  {
    id: 'setupWhisper',
    titleKey: 'onboarding.setupWhisperTitle' as const,
    descKey: 'onboarding.setupWhisperDesc' as const,
    iconName: 'Settings' as const,
    extra: 'setupWhisper' as const,
  },
];

const ICON_KEYS = {
  Mic: 'mic',
  Lock: 'lock',
  Sparkles: 'sparkles',
  Zap: 'zap',
  Settings: 'setup',
} as const;

export type OnboardingSlide = OnboardingSlideContent;
export type OnboardingSlideContent = {
  id: string;
  titleKey: string;
  descKey: string;
  iconName: 'Mic' | 'Lock' | 'Sparkles' | 'Zap' | 'Settings';
  iconColor: string;
  iconBg: string;
  extra?: 'dots' | 'privacy' | 'ai-features' | 'check' | 'setup' | 'setupWhisper';
};

export const getOnboardingSlides = (colors: Colors): OnboardingSlideContent[] =>
  SLIDE_CONTENT.map((slide) => {
    const { color, bg } = colors.onboarding[ICON_KEYS[slide.iconName]];
    return {
      ...slide,
      iconColor: color,
      iconBg: bg,
    };
  });
