import {
  getShareNoteEmailPreviewMarkdown,
  getShareNoteEmailPreviewTitle,
  parseShareNoteEmailPreviewVariant,
} from './share-note-email-preview-fixtures';

describe('parseShareNoteEmailPreviewVariant', () => {
  it('parses known variants', () => {
    expect(parseShareNoteEmailPreviewVariant('transcript')).toBe('transcript');
    expect(parseShareNoteEmailPreviewVariant('meeting-brief')).toBe('meeting-brief');
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
});
