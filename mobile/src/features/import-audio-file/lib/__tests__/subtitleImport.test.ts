import {
  isSubtitleImportFileName,
  looksLikeSubtitleContent,
  parseSubtitleImport,
} from '../subtitleImport';

describe('subtitleImport', () => {
  it('parses SRT cues into transcript segments', () => {
    const parsed = parseSubtitleImport(`1
00:00:01,200 --> 00:00:03,500
Hello <i>there</i>.

2
00:00:04,000 --> 00:00:05,250
Second line
continues.
`);

    expect(parsed).not.toBeNull();
    expect(parsed?.transcript).toBe('Hello there.\nSecond line continues.');
    expect(parsed?.durationMs).toBe(5250);
    expect(parsed?.charCount).toBe(parsed?.transcript.length);
    expect(parsed?.segments).toEqual([
      {
        id: 'subtitle-1',
        startTime: '0:01',
        startMs: 1200,
        endMs: 3500,
        text: 'Hello there.',
      },
      {
        id: 'subtitle-2',
        startTime: '0:04',
        startMs: 4000,
        endMs: 5250,
        text: 'Second line continues.',
      },
    ]);
  });

  it('parses WebVTT cues with cue settings', () => {
    const parsed = parseSubtitleImport(`WEBVTT

intro
00:00:00.000 --> 00:00:02.000 align:start position:0%
First cue

00:00:02.500 --> 00:00:04.000
Second cue
`);

    expect(parsed?.transcript).toBe('First cue\nSecond cue');
    expect(parsed?.segments[0]?.startMs).toBe(0);
    expect(parsed?.segments[1]?.endMs).toBe(4000);
  });

  it('parses SBV timestamp lines', () => {
    const parsed = parseSubtitleImport(`0:00.000,0:01.500
One

0:01.500,0:03.000
Two
`);

    expect(parsed?.transcript).toBe('One\nTwo');
    expect(parsed?.durationMs).toBe(3000);
  });

  it('detects subtitle names and content', () => {
    expect(isSubtitleImportFileName('meeting.ru.srt')).toBe(true);
    expect(isSubtitleImportFileName('voice.m4a')).toBe(false);
    expect(looksLikeSubtitleContent('00:00:01,000 --> 00:00:02,000\nHello')).toBe(true);
    expect(looksLikeSubtitleContent('Just a plain note')).toBe(false);
  });
});
