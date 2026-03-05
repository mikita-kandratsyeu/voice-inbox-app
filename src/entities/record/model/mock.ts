import { VoiceRecord } from './types';

export const MOCK_RECORDS: VoiceRecord[] = [
  {
    id: '1',
    title: 'Идея для нового проекта',
    transcript: 'Создать приложение для голосовых заметок с AI',
    duration: '2:05',
    createdAt: '18 февр.',
    status: 'read',
    isPinned: true,
    tags: ['проект', 'идея'],
  },
  {
    id: '2',
    title: 'Встреча с командой',
    transcript: 'Обсуждение текущего спринта',
    duration: '5:20',
    createdAt: '17 февр.',
    status: 'read',
    isPinned: false,
    tags: ['работа', 'встреча'],
  },
  {
    id: '3',
    title: 'Список покупок',
    transcript: 'Молоко, хлеб, яйца, сыр, овощи на неделю',
    duration: '0:45',
    createdAt: '16 февр.',
    status: 'unread',
    isPinned: false,
    tags: ['личное'],
  },
  {
    id: '4',
    title: 'Конспект лекции по UX',
    transcript: 'Основные принципы пользовательского опыта и дизайн-мышления',
    duration: '30:50',
    createdAt: '15 февр.',
    status: 'read',
    isPinned: false,
    tags: ['учёба'],
  },
];
