import type { Colors } from '@/shared/config';

type SlideDef = {
  id: string;
  titleKey: string;
  descKey: string;
  iconName: SlideIconName;
  extra?: SlideExtra;
};

type SlideIconName =
  | 'Mic'
  | 'Lock'
  | 'Sparkles'
  | 'Smartphone'
  | 'Zap'
  | 'Settings'
  | 'Shield'
  | 'UploadCloud';

type SlideExtra =
  | 'dots'
  | 'privacy'
  | 'ai-features'
  | 'private-mode'
  | 'check'
  | 'permissions'
  | 'setup'
  | 'setupWhisper'
  | 'restore'
  | 'meeting-import';

const ONBOARDING_SLIDES: SlideDef[] = [
  {
    id: 'record',
    titleKey: 'onboarding.recordTitle',
    descKey: 'onboarding.recordDesc',
    iconName: 'Mic',
    extra: 'dots',
  },
  {
    id: 'permissions',
    titleKey: 'permissions.onboardingTitle',
    descKey: 'permissions.onboardingDesc',
    iconName: 'Shield',
    extra: 'permissions',
  },
  {
    id: 'setup',
    titleKey: 'onboarding.setupAiTitle',
    descKey: 'onboarding.setupAiDesc',
    iconName: 'Settings',
    extra: 'setup',
  },
  {
    id: 'setupWhisper',
    titleKey: 'onboarding.setupWhisperTitle',
    descKey: 'onboarding.setupWhisperDesc',
    iconName: 'Settings',
    extra: 'setupWhisper',
  },
];

const ICON_KEYS: Record<SlideIconName, keyof Colors['onboarding']> = {
  Mic: 'mic',
  Lock: 'lock',
  Sparkles: 'sparkles',
  Smartphone: 'privateSlide',
  Zap: 'zap',
  Settings: 'setup',
  Shield: 'shield',
  UploadCloud: 'restore',
};

export type OnboardingSlide = OnboardingSlideContent;
export type OnboardingSlideContent = {
  id: string;
  titleKey: string;
  descKey: string;
  iconName: SlideIconName;
  iconColor: string;
  iconBg: string;
  extra?: SlideExtra;
};

export const getOnboardingSlides = (colors: Colors): OnboardingSlideContent[] =>
  ONBOARDING_SLIDES.map((slide) => {
    const key = ICON_KEYS[slide.iconName];
    const tone = colors.onboarding[key];
    if ('color' in tone && 'bg' in tone) {
      return {
        ...slide,
        iconColor: tone.color,
        iconBg: tone.bg,
      };
    }
    return {
      ...slide,
      iconColor: colors.accent.primary,
      iconBg: colors.background.tertiary,
    };
  });
