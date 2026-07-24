import { estimateReadingTimeMinutes } from './reading-time';

describe('estimateReadingTimeMinutes', () => {
  it('strips markdown and returns at least one minute', () => {
    expect(estimateReadingTimeMinutes('# Title\n\nShort post.', 'en')).toBe(1);
  });

  it('scales with word count', () => {
    const words = Array.from({ length: 440 }, () => 'word').join(' ');
    expect(estimateReadingTimeMinutes(words, 'en')).toBe(2);
  });

  it('uses slightly lower WPM for Russian locale', () => {
    const words = Array.from({ length: 380 }, () => 'слово').join(' ');
    const ruMinutes = estimateReadingTimeMinutes(words, 'ru');
    const enMinutes = estimateReadingTimeMinutes(words, 'en');
    expect(ruMinutes).toBeGreaterThanOrEqual(enMinutes);
  });
});
