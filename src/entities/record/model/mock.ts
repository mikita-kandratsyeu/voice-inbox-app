import type { VoiceRecord } from './types';

const daysAgo = (days: number, hours = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

export const MOCK_RECORDS: VoiceRecord[] = [
  {
    id: '1',
    title: 'Идея для нового проекта',
    transcript: 'Создать приложение для голосовых заметок с AI',
    transcriptSegments: [
      { id: 's1', startTime: '0:00', text: 'Создать приложение для голосовых заметок с AI.' },
      {
        id: 's2',
        startTime: '0:18',
        text: 'Основные фичи: запись, транскрипция, умный поиск по содержимому.',
      },
      {
        id: 's3',
        startTime: '0:42',
        text: 'Использовать локальный Whisper для приватности пользователя.',
      },
      { id: 's4', startTime: '1:10', text: 'Монетизация через подписку — Pro-план с облаком.' },
    ],
    summary:
      'Идея приложения для голосовых заметок с AI-транскрипцией на базе локального Whisper. Ключевые фичи: оффлайн-транскрипция, умный поиск, Pro-подписка с облачной синхронизацией.',
    tasks: [
      { id: 't1', text: 'Исследовать рынок голосовых заметок', isDone: true },
      { id: 't2', text: 'Интегрировать Whisper.cpp в RN', isDone: false },
      { id: 't3', text: 'Спроектировать экраны в Figma', isDone: false },
      { id: 't4', text: 'Настроить CI/CD', isDone: false },
    ],
    duration: '2:05',
    createdAt: daysAgo(2),
    status: 'read',
    aiStatus: 'done',
    isPinned: true,
    tags: ['проект', 'идея'],
  },
  {
    id: '2',
    title: 'Встреча с командой',
    transcript:
      'Обсудили спринт, основные проблемы с интеграцией API. Андрей предложил использовать кэширование для ускорения. Нужно пересмотреть архитектуру базы данных.',
    transcriptSegments: [
      {
        id: 's1',
        startTime: '0:00',
        text: 'Обсудили текущий спринт и основные проблемы с интеграцией API.',
      },
      {
        id: 's2',
        startTime: '1:15',
        text: 'Андрей предложил использовать кэширование для ускорения запросов.',
      },
      {
        id: 's3',
        startTime: '2:40',
        text: 'Решили пересмотреть архитектуру базы данных — переход на PostgreSQL.',
      },
      {
        id: 's4',
        startTime: '4:00',
        text: 'Следующее ревью в пятницу, нужно подготовить PR к четвергу.',
      },
    ],
    summary:
      'Встреча по текущему спринту. Выявлены проблемы с API, предложено кэширование. Запланирован переход на PostgreSQL и ревью в пятницу.',
    tasks: [
      { id: 't1', text: 'Внедрить кэширование для API', isDone: false },
      { id: 't2', text: 'Подготовить PR к четвергу', isDone: false },
      { id: 't3', text: 'Провести ревью архитектуры БД', isDone: false },
    ],
    duration: '5:20',
    createdAt: daysAgo(0, 8),
    status: 'read',
    aiStatus: 'done',
    isPinned: false,
    tags: ['работа', 'встреча'],
  },
  {
    id: '3',
    title: 'Список покупок',
    transcript: '',
    transcriptSegments: [],
    summary: '',
    tasks: [],
    duration: '0:45',
    createdAt: daysAgo(1),
    status: 'unread',
    aiStatus: 'processing',
    transcriptProgress: 67,
    isPinned: false,
    tags: ['личное'],
  },
  {
    id: '4',
    title: 'Конспект лекции по UX',
    transcript: 'Основные принципы пользовательского опыта и дизайн-мышления',
    transcriptSegments: [
      {
        id: 's1',
        startTime: '0:00',
        text: 'Дизайн-мышление: эмпатия, определение, идеация, прототип, тест.',
      },
      {
        id: 's2',
        startTime: '5:20',
        text: 'Принцип наименьшего удивления — пользователь должен получать ожидаемое.',
      },
      {
        id: 's3',
        startTime: '12:00',
        text: 'Иерархия Маслоу в UX: функциональность, надёжность, удобство, удовольствие.',
      },
      {
        id: 's4',
        startTime: '20:15',
        text: 'A/B тестирование и метрики: CR, retention, NPS, time-on-task.',
      },
    ],
    summary:
      'Лекция по UX: дизайн-мышление (5 этапов), принцип наименьшего удивления, UX-иерархия Маслоу, A/B тесты и ключевые метрики.',
    tasks: [
      { id: 't1', text: 'Прочитать книгу «Дизайн привычных вещей»', isDone: false },
      { id: 't2', text: 'Провести UX-аудит нашего приложения', isDone: false },
    ],
    duration: '30:50',
    createdAt: daysAgo(3),
    status: 'read',
    aiStatus: 'done',
    isPinned: false,
    tags: ['учёба'],
  },
  {
    id: '5',
    title: 'Заметка после звонка',
    transcript: '',
    transcriptSegments: [],
    summary: '',
    tasks: [],
    duration: '0:01',
    createdAt: daysAgo(0, 0),
    status: 'unread',
    aiStatus: 'idle',
    isPinned: false,
    tags: [],
  },
  {
    id: '6',
    title: 'Звонок с клиентом',
    transcript: '',
    transcriptSegments: [],
    summary: '',
    tasks: [],
    duration: '12:34',
    createdAt: daysAgo(0, 1),
    status: 'unread',
    aiStatus: 'error',
    isPinned: false,
    tags: ['работа'],
  },
];
