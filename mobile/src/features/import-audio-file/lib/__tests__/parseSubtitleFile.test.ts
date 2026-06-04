import { parseSubtitleContent, parseSubtitleFile, parseTimestampToMs } from '../parseSubtitleFile';

describe('parseTimestampToMs', () => {
  it('parses HH:MM:SS.mmm', () => {
    expect(parseTimestampToMs('01:02:03.456')).toBe(3723456);
  });

  it('parses MM:SS,mmm', () => {
    expect(parseTimestampToMs('02:03,500')).toBe(123500);
  });
});

describe('parseSubtitleContent', () => {
  it('parses minimal WebVTT', () => {
    const raw = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello world

00:00:03.500 --> 00:00:05.000
Second line`;

    const result = parseSubtitleContent(raw, 'vtt');
    expect(result).not.toBeNull();
    expect(result?.transcript).toBe('Hello world\nSecond line');
    expect(result?.segments).toHaveLength(2);
    expect(result?.segments[0]?.startMs).toBe(1000);
    expect(result?.segments[1]?.endMs).toBe(5000);
    expect(result?.durationMs).toBe(5000);
  });

  it('strips inline VTT tags', () => {
    const raw = `WEBVTT

00:00:00.000 --> 00:00:02.000
<v Speaker>Hi there</v>`;

    const result = parseSubtitleContent(raw, 'vtt');
    expect(result?.segments[0]?.text).toBe('Hi there');
  });

  it('parses SRT blocks', () => {
    const raw = `1
00:00:01,000 --> 00:00:02,000
First cue

2
00:00:02,500 --> 00:00:04,000
Second cue`;

    const result = parseSubtitleContent(raw, 'srt');
    expect(result?.transcript).toBe('First cue\nSecond cue');
    expect(result?.segments).toHaveLength(2);
  });
});

describe('parseSubtitleFile', () => {
  it('returns null for empty cues', () => {
    expect(parseSubtitleFile('WEBVTT\n\n', 'notes.vtt')).toBeNull();
  });
});
