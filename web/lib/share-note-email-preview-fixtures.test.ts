import {
  getShareNoteEmailPreviewMarkdown,
  getShareNoteEmailPreviewTitle,
  parseShareNoteEmailPreviewVariant,
} from './share-note-email-preview-fixtures';

describe('parseShareNoteEmailPreviewVariant', () => {
  it('parses known variants', () => {
    expect(parseShareNoteEmailPreviewVariant('transcript')).toBe('transcript');
    expect(parseShareNoteEmailPreviewVariant('meeting-brief')).toBe('meeting-brief');
    expect(parseShareNoteEmailPreviewVariant('long-speaker-names')).toBe('long-speaker-names');
    expect(parseShareNoteEmailPreviewVariant('short-note')).toBe('short-note');
    expect(parseShareNoteEmailPreviewVariant('long-meeting')).toBe('long-meeting');
    expect(parseShareNoteEmailPreviewVariant('en-meeting')).toBe('en-meeting');
    expect(parseShareNoteEmailPreviewVariant('tasks')).toBe('tasks');
  });

  it('defaults to speaker-turns', () => {
    expect(parseShareNoteEmailPreviewVariant(null)).toBe('speaker-turns');
    expect(parseShareNoteEmailPreviewVariant('unknown')).toBe('speaker-turns');
  });
});

describe('getShareNoteEmailPreviewTitle', () => {
  it('returns variant-specific titles', () => {
    expect(getShareNoteEmailPreviewTitle('transcript')).toContain('транскрипт');
    expect(getShareNoteEmailPreviewTitle('meeting-brief')).toContain('итоги');
    expect(getShareNoteEmailPreviewTitle('speaker-turns')).toContain('реплики');
    expect(getShareNoteEmailPreviewTitle('short-note')).toContain('заметка');
    expect(getShareNoteEmailPreviewTitle('long-meeting')).toContain('длинная');
    expect(getShareNoteEmailPreviewTitle('en-meeting')).toContain('onboarding');
    expect(getShareNoteEmailPreviewTitle('tasks')).toContain('задачи');
    expect(getShareNoteEmailPreviewTitle('long-speaker-names')).toContain('Таунхолл');
  });
});

describe('getShareNoteEmailPreviewMarkdown', () => {
  it('includes stable speaker-turns marker and sample dialogue', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('speaker-turns');

    expect(markdown).toContain('vi:section:speaker-turns');
    expect(markdown).toContain('## По участникам');
    expect(markdown).toContain('Участник 1:');
    expect(markdown).toContain('Создано в Voice Inbox AI');
  });

  it('includes transcript section for transcript variant', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('transcript');
    expect(markdown).toContain('## Транскрипт');
    expect(markdown).toContain('[00:42]');
  });

  it('includes tasks for short note variant', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('short-note');
    expect(markdown).toContain('## Задачи');
    expect(markdown).toContain('- [ ]');
  });

  it('includes English speaker turns for English meeting variant', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('en-meeting');
    expect(markdown).toContain('## Participants');
    expect(markdown).toContain('Speaker 1:');
    expect(markdown).toContain('Created with Voice Inbox AI');
  });

  it('includes mixed task states for tasks variant', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('tasks');

    expect(markdown).toContain('## Задачи');
    expect(markdown).toContain('- [ ] Сверить макеты');
    expect(markdown).toContain('- [x] Согласовать повестку');
    expect(markdown).toContain('**Итог:**');
    expect(markdown).toContain('**Отдельная заметка:**');
    expect(markdown).toContain('[[rec_presentation|');
  });

  it('includes long real speaker names for long-speaker-names variant', () => {
    const markdown = getShareNoteEmailPreviewMarkdown('long-speaker-names');

    expect(markdown).toContain('Богдан Грицовец:');
    expect(markdown).toContain('Евгений Берлин:');
    expect(markdown).toContain('Александр Рябов:');
    expect(markdown).not.toContain('## Транскрипт');
  });
});
