import type { Colors } from '@/shared/config';
import { getExperimentalPrivateAiEnabled } from '@/shared/config/runtimeConfig';

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
  | 'restore';

const ONBOARDING_SLIDES_HEAD: SlideDef[] = [
  {
    id: 'record',
    titleKey: 'onboarding.recordTitle',
    descKey: 'onboarding.recordDesc',
    iconName: 'Mic',
    extra: 'dots',
  },
  {
    id: 'transcribe',
    titleKey: 'onboarding.transcribeTitle',
    descKey: 'onboarding.transcribeDesc',
    iconName: 'Lock',
    extra: 'privacy',
  },
  {
    id: 'ai',
    titleKey: 'onboarding.aiTitle',
    descKey: 'onboarding.aiDesc',
    iconName: 'Sparkles',
    extra: 'ai-features',
  },
];

const ONBOARDING_SLIDE_PRIVATE: SlideDef = {
  id: 'privateMode',
  titleKey: 'onboarding.privateModeTitle',
  descKey: 'onboarding.privateModeDesc',
  iconName: 'Smartphone',
  extra: 'private-mode',
};

const ONBOARDING_SLIDES_TAIL: SlideDef[] = [
  {
    id: 'ready',
    titleKey: 'onboarding.readyTitle',
    descKey: 'onboarding.readyDesc',
    iconName: 'Zap',
    extra: 'check',
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
  {
    id: 'restore',
    titleKey: 'onboarding.restoreTitle',
    descKey: 'onboarding.restoreDesc',
    iconName: 'UploadCloud',
    extra: 'restore',
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

function buildSlideDefs(): SlideDef[] {
  if (getExperimentalPrivateAiEnabled()) {
    return [...ONBOARDING_SLIDES_HEAD, ONBOARDING_SLIDE_PRIVATE, ...ONBOARDING_SLIDES_TAIL];
  }
  return [...ONBOARDING_SLIDES_HEAD, ...ONBOARDING_SLIDES_TAIL];
}

export const getOnboardingSlides = (colors: Colors): OnboardingSlideContent[] =>
  buildSlideDefs().map((slide) => {
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
