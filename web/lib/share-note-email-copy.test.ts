import {
  buildShareNoteEmailPlainText,
  buildShareNoteEmailShellStrings,
  normalizeShareNoteEmailLocale,
} from './share-note-email-copy';

describe('normalizeShareNoteEmailLocale', () => {
  test('maps ru and defaults to en', () => {
    expect(normalizeShareNoteEmailLocale('ru')).toBe('ru');
    expect(normalizeShareNoteEmailLocale('en')).toBe('en');
    expect(normalizeShareNoteEmailLocale('de')).toBe('en');
    expect(normalizeShareNoteEmailLocale(undefined)).toBe('en');
  });
});

describe('share note email copy', () => {
  test('uses Russian intro for note emails', () => {
    const strings = buildShareNoteEmailShellStrings({
      locale: 'ru',
      title: 'Встреча',
    });

    expect(strings.intro).toBe('Пользователь Voice Inbox AI поделился с вами этой заметкой.');
    expect(strings.preheader).toContain('Заметка из Voice Inbox AI');
    expect(strings.footerLine).toContain('пользователем приложения');
  });

  test('uses Russian export copy for multipart emails', () => {
    const text = buildShareNoteEmailPlainText({
      locale: 'ru',
      title: 'Экспорт',
      body: 'Текст письма',
      kind: 'export',
      attachmentKind: 'pdf',
      attachmentFilename: 'note.pdf',
    });

    expect(text).toContain('поделился с вами экспортом');
    expect(text).toContain('Вложение: note.pdf');
    expect(text).toContain('Текст письма');
  });
});
