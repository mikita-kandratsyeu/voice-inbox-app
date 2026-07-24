import {
  buildAskInterpretationUserHintBlock,
  isAskQuestionAnalytical,
} from '../askInterpretationHint';

describe('askInterpretationHint', () => {
  it('detects analytical Russian questions', () => {
    expect(isAskQuestionAnalytical('Какие риски видишь?')).toBe(true);
    expect(isAskQuestionAnalytical('Что самое приоритетное?')).toBe(true);
  });

  it('skips factual recap questions', () => {
    expect(isAskQuestionAnalytical('Кратко перескажи')).toBe(false);
  });

  it('adds user hint for analytical questions', () => {
    expect(buildAskInterpretationUserHintBlock('Какие выводы?')).toContain('interpretations');
  });
});
