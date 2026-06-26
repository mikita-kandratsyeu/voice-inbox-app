import {
  cleanTranscriptSegmentText,
  collapseRepeatedTokenStutters,
  isUsableTranscriptText,
  stripWhisperSpecialTokens,
} from '../cleanTranscriptText';

describe('stripWhisperSpecialTokens', () => {
  it('removes whisper control and timestamp tokens', () => {
    const raw =
      '<|startoftranscript|><|ru|><|transcribe|><|0.00|> Я думаю, это еще самое, <|9.00|>';
    expect(stripWhisperSpecialTokens(raw)).toBe('Я думаю, это еще самое,');
  });
});

describe('cleanTranscriptSegmentText', () => {
  it('strips tokens and collapses stutters', () => {
    expect(
      cleanTranscriptSegmentText('<|23.00|> мы будем иметь три сайлла <|28.00|>'),
    ).toBe('мы будем иметь три сайлла');
  });
});

describe('isUsableTranscriptText', () => {
  it('rejects telugu looping hallucinations from device logs', () => {
    const teluguLoop = ' కికికికికికికికికికికికికికికికికికికికికికికిక';
    expect(isUsableTranscriptText(teluguLoop)).toBe(false);
  });

  it('rejects telugu ల repetition rejected on other chunks', () => {
    const teluguLa = ' వరలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలలల';
    expect(isUsableTranscriptText(teluguLa)).toBe(false);
  });

  it('rejects whisper sound markers', () => {
    expect(isUsableTranscriptText('*звук сзывов*')).toBe(false);
    expect(isUsableTranscriptText('[звук звука]')).toBe(false);
  });

  it('keeps normal russian speech', () => {
    expect(isUsableTranscriptText(' о чем рассказывала на презентации и новой серии')).toBe(true);
  });
});

describe('collapseRepeatedTokenStutters', () => {
  it('collapses three or more repeated tokens', () => {
    expect(collapseRepeatedTokenStutters('wh wh wh why')).toBe('wh why');
  });

  it('preserves two repeated tokens', () => {
    expect(collapseRepeatedTokenStutters('no no is fine')).toBe('no no is fine');
  });
});
