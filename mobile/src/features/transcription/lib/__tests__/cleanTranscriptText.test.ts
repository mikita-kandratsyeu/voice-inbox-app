import { collapseRepeatedTokenStutters, isUsableTranscriptText } from '../cleanTranscriptText';

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
