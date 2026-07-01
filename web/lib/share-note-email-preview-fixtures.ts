import { SHARE_SPEAKER_TURNS_SECTION_MARKER } from '@/lib/shareNoteSectionMarkers';

export type ShareNoteEmailPreviewVariant =
  | 'speaker-turns'
  | 'transcript'
  | 'meeting-brief'
  | 'short-note'
  | 'long-meeting'
  | 'en-meeting'
  | 'tasks';

const DISCLAIMER_RU =
  'Реплики сгруппированы для удобного просмотра. Подписи участников — подсказка ИИ, где текст может не совпадать с записью дословно.';

const FOOTER_RU = 'Создано в Voice Inbox AI';

const SPEAKER_TURNS_BODY = `Участник 1: Нужно срочно отправить отчёт Ивану.

Участник 1: И на следующей неделе запланировать встречу с командой.

Участник 2: Да, согласен. По отчёту — до пятницы.

Участник 2: По встрече: предлагаю вторник, после обеда. Если всем ок — закрепим в календаре и разошлём повестку.`;

const TRANSCRIPT_BODY = `[00:00] Добрый день, начинаем.
[00:42] Первый пункт — отчёт по проекту.
[01:15] Второй — планирование встречи на следующую неделю.`;

const MEETING_BRIEF_EXTRA = `## Сводка

Обсудили сроки отчёта и планирование командной встречи на следующую неделю.

## Следующие шаги

- Отправить отчёт Ивану до пятницы
- Согласовать встречу во вторник после обеда`;

const SHORT_NOTE = `**Дата:** 12 июн. 2026
**Длительность:** 00:38
**Тип:** Заметка

## Сводка

Купить батарейки для микрофона и проверить звук перед записью интервью.

## Задачи

- [ ] Купить батарейки (Дедлайн: сегодня, Приоритет: высокий)
- [x] Отправить отчёт
  - **Отдельная заметка:** [[rec_follow_up|Итог: отчёт отправлен]]

${FOOTER_RU}`;

const TASKS_MIXED = `**Дата:** 12 июн. 2026
**Длительность:** 24:18
**Тип:** Встреча

## Сводка

Согласовали запуск пилота и разобрали открытые задачи: часть уже закрыта, по остальным зафиксировали сроки.

## Задачи

- [ ] Сверить макеты с дизайном (Дедлайн: завтра, Приоритет: высокий)
- [ ] Отправить договор юристам (Дедлайн: 2026-06-20, Приоритет: средний)
- [x] Согласовать повестку встречи
- [x] Заказать обед для команды
  - **Итог:** Заказали на 12 человек, доставка к 13:00
- [x] Подготовить презентацию для клиента
  - **Отдельная заметка:** [[rec_presentation|Итог: слайды утверждены]]
- [x] Обновить трекер в Jira
  - **Итог:** Перенесли 4 задачи в спринт
  - **Отдельная заметка:** [[rec_jira_sync|Детали синхронизации]]

${FOOTER_RU}`;

const LONG_MEETING_EXTRA = `**Дата:** 12 июн. 2026
**Длительность:** 48:12
**Тип:** Встреча
**Папка:** Проект Orion

## Итоги встречи

### Кратко

- Подтвердили запуск закрытой беты в конце месяца
- Релизный чеклист нужно сократить до критичных пунктов
- Поддержка получит готовые ответы по частым вопросам

### Решения

- Не переносить дату беты
- Добавить отдельный owner для email-deliverability
- Отправлять клиентам краткий digest, а полный транскрипт держать во вложении

### Открытые вопросы

- Кто финально утверждает тексты onboarding-писем?
- Нужен ли отдельный шаблон для enterprise-клиентов?

## Задачи

- [ ] Сверить SPF/DKIM/DMARC (Дедлайн: 2026-06-14, Приоритет: высокий)
- [x] Подготовить список beta-пользователей
- [ ] Отправить legal финальный текст privacy notice`;

const EN_MEETING = `**Date:** Jun 12, 2026
**Duration:** 31:04
**Type:** Meeting

## Meeting recap

### Brief

- Reviewed the customer onboarding funnel
- Agreed to shorten the first email and move details into the attachment

### Decisions

- Keep the subject under 60 characters
- Add a plain-text intro before the exported note

## Tasks

- [ ] Draft revised onboarding copy (Deadline: Monday, Priority: high)
- [ ] Review email previews in Gmail and Apple Mail

${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## Participants

_AI-generated speaker labels are provided as a guide._

Speaker 1: The first email should explain why the recipient got this note.

Speaker 2: Agreed. The content is good, but the current version starts too abruptly.

Created with Voice Inbox AI`;

function speakerTurnsSection(): string {
  return `${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## По участникам

_${DISCLAIMER_RU}_

${SPEAKER_TURNS_BODY}`;
}

function transcriptSection(): string {
  return `## Транскрипт

${TRANSCRIPT_BODY}`;
}

export function getShareNoteEmailPreviewTitle(variant: ShareNoteEmailPreviewVariant): string {
  switch (variant) {
    case 'short-note':
      return 'Быстрая заметка';
    case 'long-meeting':
      return 'Проект Orion — длинная встреча';
    case 'en-meeting':
      return 'Customer onboarding recap';
    case 'tasks':
      return 'Совещание — задачи';
    case 'transcript':
      return 'Совещание — транскрипт';
    case 'meeting-brief':
      return 'Совещание — итоги';
    case 'speaker-turns':
    default:
      return 'Совещание — реплики по спикерам';
  }
}

export function getShareNoteEmailPreviewMarkdown(variant: ShareNoteEmailPreviewVariant): string {
  if (variant === 'short-note') {
    return SHORT_NOTE;
  }

  if (variant === 'tasks') {
    return TASKS_MIXED;
  }

  if (variant === 'en-meeting') {
    return EN_MEETING;
  }

  const sections: string[] = [];

  if (variant === 'long-meeting') {
    sections.push(LONG_MEETING_EXTRA);
  } else if (variant === 'meeting-brief') {
    sections.push(MEETING_BRIEF_EXTRA);
  }

  if (variant === 'transcript' || variant === 'meeting-brief' || variant === 'long-meeting') {
    sections.push(transcriptSection());
  }

  sections.push(speakerTurnsSection());
  sections.push('', FOOTER_RU);

  return sections.join('\n\n');
}

export function parseShareNoteEmailPreviewVariant(
  raw: string | null,
): ShareNoteEmailPreviewVariant {
  if (
    raw === 'transcript' ||
    raw === 'meeting-brief' ||
    raw === 'short-note' ||
    raw === 'long-meeting' ||
    raw === 'en-meeting' ||
    raw === 'tasks'
  ) {
    return raw;
  }
  return 'speaker-turns';
}
