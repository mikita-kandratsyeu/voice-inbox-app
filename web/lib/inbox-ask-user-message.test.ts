import {
  buildInboxAskUserMessageContent,
  estimateInboxAskRoutingChars,
  parseInboxAskPriorTurns,
} from './inbox-ask-user-message';

describe('parseInboxAskPriorTurns', () => {
  it('normalizes, trims, and caps prior turns', () => {
    const turns = parseInboxAskPriorTurns([
      { question: '  What tasks?  ', answer: '  Three open tasks.  ' },
      { question: '', answer: 'ignored' },
      { question: 'only question', answer: '' },
    ]);

    expect(turns).toEqual([{ question: 'What tasks?', answer: 'Three open tasks.' }]);
  });

  it('keeps only the last six turns', () => {
    const raw = Array.from({ length: 8 }, (_, index) => ({
      question: `Q${index}`,
      answer: `A${index}`,
    }));

    const turns = parseInboxAskPriorTurns(raw);
    expect(turns).toHaveLength(6);
    expect(turns?.[0]).toEqual({ question: 'Q2', answer: 'A2' });
    expect(turns?.at(-1)).toEqual({ question: 'Q7', answer: 'A7' });
  });

  it('returns undefined for empty or invalid input', () => {
    expect(parseInboxAskPriorTurns(undefined)).toBeUndefined();
    expect(parseInboxAskPriorTurns([])).toBeUndefined();
    expect(parseInboxAskPriorTurns([null, 1, {}])).toBeUndefined();
  });
});

describe('buildInboxAskUserMessageContent', () => {
  it('includes corpus notes, prior turns, question, and analytical hint', () => {
    const content = buildInboxAskUserMessageContent(
      [
        {
          recordId: 'rec-1',
          title: 'Budget sync',
          summary: 'Discussed Q2 budget',
        },
      ],
      'Какие риски видишь?',
      [{ question: 'What changed?', answer: 'Budget moved to Q3.' }],
    );

    expect(content).toContain('Budget sync');
    expect(content).toContain('Prior questions and answers in this inbox chat');
    expect(content).toContain('Q: What changed?');
    expect(content).toContain('Question: Какие риски видишь?');
    expect(content.toLowerCase()).toContain('interpretations');
  });
});

describe('estimateInboxAskRoutingChars', () => {
  it('counts system prompt plus user message length', () => {
    const corpus = [{ recordId: 'rec-1', title: 'Note', summary: 'Summary text' }];
    const chars = estimateInboxAskRoutingChars(corpus, 'What tasks are open?');

    expect(chars).toBeGreaterThan(buildInboxAskUserMessageContent(corpus, 'What tasks are open?').length);
  });
});
