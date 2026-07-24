import { buildCustomWordsPrompt, buildWhisperPrompt } from '../buildWhisperPrompt';

describe('buildWhisperPrompt', () => {
  it('builds a custom vocabulary prompt', () => {
    expect(buildCustomWordsPrompt(['OpenAI', 'ChargeBee'])).toBe('OpenAI, ChargeBee');
  });

  it('combines custom words with previous transcript tail', () => {
    expect(buildWhisperPrompt('previous transcript text', ['OpenAI'])).toBe(
      'OpenAI previous transcript text',
    );
  });
});
