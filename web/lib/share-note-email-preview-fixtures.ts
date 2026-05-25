export type ShareNoteEmailPreviewVariant = 'speaker-turns' | 'transcript' | 'meeting-brief';

const DISCLAIMER_RU =
  'Текст разбит на блоки, чтобы по встрече было проще ориентироваться. Подписи спикеров даёт ИИ. Воспринимайте их как ориентир.';

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

function speakerTurnsSection(): string {
  return `## Реплики по спикерам

_${DISCLAIMER_RU}_

${SPEAKER_TURNS_BODY}`;
}

function transcriptSection(): string {
  return `## Транскрипт

${TRANSCRIPT_BODY}`;
}

export function getShareNoteEmailPreviewTitle(variant: ShareNoteEmailPreviewVariant): string {
  switch (variant) {
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
  const sections: string[] = [];

  if (variant === 'meeting-brief') {
    sections.push(MEETING_BRIEF_EXTRA);
  }

  if (variant === 'transcript' || variant === 'meeting-brief') {
    sections.push(transcriptSection());
  }

  sections.push(speakerTurnsSection());
  sections.push('', FOOTER_RU);

  return sections.join('\n\n');
}

export function parseShareNoteEmailPreviewVariant(
  raw: string | null,
): ShareNoteEmailPreviewVariant {
  if (raw === 'transcript' || raw === 'meeting-brief') {
    return raw;
  }
  return 'speaker-turns';
}
