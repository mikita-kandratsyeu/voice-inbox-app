import {
  SHARE_SPEAKER_TURNS_SECTION_MARKER,
  SHARE_SPEAKER_TURNS_SECTION_MARKER_RE,
} from './shareNoteSectionMarkers';
import {
  buildTwoColumnShareNoteEmailTableHtml,
  escapeMarkdownTableCell,
  replaceMarkdownSection,
  replaceMarkdownSectionByMarker,
  SHARE_NOTE_EMAIL_TABLE_FIRST_COL_PX,
  splitShareNoteEmailTableBlocks,
  twoColumnMarkdownTable,
} from './shareNoteEmailMarkdownTables';

const TABLE_OPEN = '§§SHARE_NOTE_TABLE§§';

describe('escapeMarkdownTableCell', () => {
  it('escapes pipes and collapses newlines', () => {
    expect(escapeMarkdownTableCell('a | b\nc')).toBe('a \\| b c');
  });
});

describe('buildTwoColumnShareNoteEmailTableHtml', () => {
  it('returns empty string for no rows', () => {
    expect(buildTwoColumnShareNoteEmailTableHtml([])).toBe('');
  });

  it('renders email-safe table with escaped HTML in cells', () => {
    const html = buildTwoColumnShareNoteEmailTableHtml([
      { first: 'Участник 1', second: 'Текст <script>' },
      { first: 'Участник 2', second: '' },
    ]);

    expect(html).toContain('<table role="presentation"');
    expect(html).toContain(`width:${SHARE_NOTE_EMAIL_TABLE_FIRST_COL_PX}px`);
    expect(html).toContain('Участник 1');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('—');
  });
});

describe('twoColumnMarkdownTable', () => {
  it('wraps HTML table in internal block markers', () => {
    const block = twoColumnMarkdownTable([{ first: '00:01', second: 'Hello' }]);
    expect(block).toContain(TABLE_OPEN);
    expect(block).toContain('§§/SHARE_NOTE_TABLE§§');
    expect(block).toContain('00:01');
  });

  it('returns empty string when rows are empty', () => {
    expect(twoColumnMarkdownTable([])).toBe('');
  });
});

describe('splitShareNoteEmailTableBlocks', () => {
  it('splits markdown around internal table blocks', () => {
    const table = twoColumnMarkdownTable([{ first: 'A', second: 'B' }]);
    const markdown = `## Intro\n\n${table}\n\n## Outro`;
    const segments = splitShareNoteEmailTableBlocks(markdown);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.type).toBe('markdown');
    if (segments[0]?.type === 'markdown') {
      expect(segments[0].content).toContain('## Intro');
    }
    expect(segments[1]?.type).toBe('table');
    if (segments[1]?.type === 'table') {
      expect(segments[1].html).toContain('<table');
    }
    expect(segments[2]?.type).toBe('markdown');
    if (segments[2]?.type === 'markdown') {
      expect(segments[2].content).toContain('## Outro');
    }
  });

  it('returns single markdown segment when no table blocks exist', () => {
    expect(splitShareNoteEmailTableBlocks('plain text')).toEqual([
      { type: 'markdown', content: 'plain text' },
    ]);
  });
});

describe('replaceMarkdownSection', () => {
  it('transforms body until next heading', () => {
    const markdown = `## Section A\n\nbody\n\n## Section B\n\ntail`;
    const result = replaceMarkdownSection(markdown, /^## Section A\r?\n/im, () => 'TABLE');

    expect(result).toContain('## Section A\nTABLE');
    expect(result).toContain('## Section B');
    expect(result).toContain('tail');
  });

  it('stops at export footer', () => {
    const markdown = `## Section A\n\nbody\n\nСоздано в Voice Inbox AI`;
    const result = replaceMarkdownSection(markdown, /^## Section A\r?\n/im, () => 'TABLE');

    expect(result).toContain('## Section A\nTABLE');
    expect(result).toContain('Создано в Voice Inbox AI');
  });

  it('returns original markdown when heading is missing', () => {
    const markdown = 'no headings';
    expect(replaceMarkdownSection(markdown, /^## Missing\r?\n/im, () => 'X')).toBe(markdown);
  });
});

describe('replaceMarkdownSectionByMarker', () => {
  it('strips marker and transforms following section body', () => {
    const markdown = `intro\n${SHARE_SPEAKER_TURNS_SECTION_MARKER}\n## Title\n\nSpeaker 1: Hi\n\n## Next`;
    const result = replaceMarkdownSectionByMarker(
      markdown,
      SHARE_SPEAKER_TURNS_SECTION_MARKER_RE,
      (body) => `REPLACED:${body.trim()}`,
    );

    expect(result).toContain('intro\nREPLACED:## Title');
    expect(result).toContain('Speaker 1: Hi');
    expect(result).toContain('## Next');
    expect(result).not.toContain('vi:section:speaker-turns');
  });

  it('returns null when marker is absent', () => {
    expect(
      replaceMarkdownSectionByMarker(
        'plain',
        SHARE_SPEAKER_TURNS_SECTION_MARKER_RE,
        (body) => body,
      ),
    ).toBeNull();
  });
});
