export type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  iconName: 'Mic' | 'Lock' | 'Sparkles' | 'Zap';
  iconColor: string;
  iconBg: string;
  extra?: 'dots' | 'privacy' | 'ai-features' | 'check';
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'record',
    title: 'Записывайте мысли голосом',
    description:
      'Быстро фиксируйте идеи, задачи и заметки. Просто нажмите на кнопку и говорите — всё остальное сделаем мы.',
    iconName: 'Mic',
    iconColor: '#3b82f6',
    iconBg: '#dbeafe',
    extra: 'dots',
  },
  {
    id: 'transcribe',
    title: 'Оффлайн транскрипция',
    description:
      'Преобразование голоса в текст происходит локально на вашем устройстве. Никаких серверов, полная приватность.',
    iconName: 'Lock',
    iconColor: '#8b5cf6',
    iconBg: '#ede9fe',
    extra: 'privacy',
  },
  {
    id: 'ai',
    title: 'ИИ обработка по запросу',
    description:
      'Создавайте конспекты и извлекайте задачи только когда нужно. ИИ поможет структурировать записи.',
    iconName: 'Sparkles',
    iconColor: '#f59e0b',
    iconBg: '#fef3c7',
    extra: 'ai-features',
  },
  {
    id: 'ready',
    title: 'Всё готово!',
    description:
      'Начните записывать свои мысли прямо сейчас. Voice Inbox всегда под рукой для ваших идей.',
    iconName: 'Zap',
    iconColor: '#10b981',
    iconBg: '#d1fae5',
    extra: 'check',
  },
];
