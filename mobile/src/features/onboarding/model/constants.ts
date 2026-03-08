import type { Colors } from '@/shared/config';

export type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  iconName: 'Mic' | 'Lock' | 'Sparkles' | 'Zap';
  iconColor: string;
  iconBg: string;
  extra?: 'dots' | 'privacy' | 'ai-features' | 'check';
};

const SLIDE_CONTENT = [
  {
    id: 'record',
    title: 'Записывайте мысли голосом',
    description:
      'Быстро фиксируйте идеи, задачи и заметки. Просто нажмите на кнопку и говорите — всё остальное сделает приложение.',
    iconName: 'Mic' as const,
    extra: 'dots' as const,
  },
  {
    id: 'transcribe',
    title: 'Оффлайн транскрипция',
    description:
      'Преобразование голоса в текст происходит локально на вашем устройстве. Никаких серверов, полная приватность.',
    iconName: 'Lock' as const,
    extra: 'privacy' as const,
  },
  {
    id: 'ai',
    title: 'ИИ обработка по запросу',
    description:
      'Структурируйте записи с помощью ИИ когда нужно. Голос обрабатывается локально, текст передаётся по зашифрованному каналу и никогда не сохраняется.',
    iconName: 'Sparkles' as const,
    extra: 'ai-features' as const,
  },
  {
    id: 'ready',
    title: 'Всё готово!',
    description: 'Начните записывать свои мысли прямо сейчас. Всегда под рукой для ваших идей.',
    iconName: 'Zap' as const,
    extra: 'check' as const,
  },
];

const ICON_KEYS = {
  Mic: 'mic',
  Lock: 'lock',
  Sparkles: 'sparkles',
  Zap: 'zap',
} as const;

export const getOnboardingSlides = (colors: Colors): OnboardingSlide[] =>
  SLIDE_CONTENT.map((slide) => {
    const { color, bg } = colors.onboarding[ICON_KEYS[slide.iconName]];
    return {
      ...slide,
      iconColor: color,
      iconBg: bg,
    };
  });
