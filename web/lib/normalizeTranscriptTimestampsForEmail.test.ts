import {
  expandBoldTimestampBlocksToInlineLines,
  normalizeTranscriptTimestampLinesForEmail,
  splitTranscriptTimestampEntries,
} from './normalizeTranscriptTimestampsForEmail';

const TABLE_MARKER = '§§SHARE_NOTE_TABLE§§';

describe('expandBoldTimestampBlocksToInlineLines', () => {
  it('converts bold timestamp blocks to inline lines', () => {
    const input = `**[00:42]**

Первая реплика.

**[01:05]**

Вторая реплика.`;

    const result = expandBoldTimestampBlocksToInlineLines(input);
    expect(result).toContain('[00:42] Первая реплика.');
    expect(result).toContain('[01:05] Вторая реплика.');
  });

  it('returns input unchanged when no bold timestamps', () => {
    const input = '[00:42] plain line';
    expect(expandBoldTimestampBlocksToInlineLines(input)).toBe(input);
  });
});

describe('splitTranscriptTimestampEntries', () => {
  it('parses one timestamp per line', () => {
    expect(splitTranscriptTimestampEntries(`[00:00] Start\n[00:42] Middle`)).toEqual([
      { time: '00:00', text: 'Start' },
      { time: '00:42', text: 'Middle' },
    ]);
  });

  it('splits inline timestamps on one line', () => {
    expect(splitTranscriptTimestampEntries('[00:00] A [00:42] B')).toEqual([
      { time: '00:00', text: 'A' },
      { time: '00:42', text: 'B' },
    ]);
  });

  it('continues wrapped lines into previous entry', () => {
    expect(splitTranscriptTimestampEntries('[00:00] First line\ncontinuation')).toEqual([
      { time: '00:00', text: 'First line continuation' },
    ]);
  });
});

describe('normalizeTranscriptTimestampLinesForEmail', () => {
  it('converts transcript section into table block', () => {
    const markdown = `## Транскрипт

[00:00] Start
[00:42] End`;

    const result = normalizeTranscriptTimestampLinesForEmail(markdown);

    expect(result).toContain('## Транскрипт');
    expect(result).toContain(TABLE_MARKER);
    expect(result).toContain('00:42');
    expect(result).not.toMatch(/\[00:00\] Start/);
  });

  it('supports English transcript heading', () => {
    const markdown = `## Transcript

[00:01] Hello`;

    expect(normalizeTranscriptTimestampLinesForEmail(markdown)).toContain(TABLE_MARKER);
  });

  it('inserts paragraph breaks when transcript heading is missing', () => {
    const markdown = 'Intro\n[00:00] A\n[00:42] B';
    const result = normalizeTranscriptTimestampLinesForEmail(markdown);

    expect(result).toContain('[00:00] A\n\n[00:42]');
    expect(result).not.toContain(TABLE_MARKER);
  });

  it('returns markdown unchanged when no timestamps are present', () => {
    const markdown = '## Summary\n\nNo timestamps here.';
    expect(normalizeTranscriptTimestampLinesForEmail(markdown)).toBe(markdown);
  });

  it('does not include section markers in transcript table cells', () => {
    const markdown = `## Транскрипт

[00:00] Start
[01:15] End

<!-- vi:section:speaker-turns -->
## По участникам`;

    const result = normalizeTranscriptTimestampLinesForEmail(markdown);
    const tableBlock = result.match(/§§SHARE_NOTE_TABLE§§([\s\S]*?)§§\/SHARE_NOTE_TABLE§§/)?.[1];

    expect(tableBlock).toBeDefined();
    expect(tableBlock).not.toContain('vi:section');
    expect(tableBlock).toContain('End');
  });
});
