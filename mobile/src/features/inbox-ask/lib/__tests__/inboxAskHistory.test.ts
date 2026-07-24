import { describe, expect, it } from '@jest/globals';

import {
  normalizeInboxAskTurnMode,
  trimGeneralPriorTurns,
  trimInboxPriorTurns,
} from '../inboxAskHistory';

describe('inboxAskHistory', () => {
  it('defaults missing mode to inbox', () => {
    expect(normalizeInboxAskTurnMode({ question: 'q', answer: 'a' })).toBe('inbox');
  });

  it('keeps general turns separate from inbox prior turns', () => {
    const history = [
      { question: 'inbox q', answer: 'inbox a', mode: 'inbox' as const },
      { question: 'general q', answer: 'general a', mode: 'general' as const },
      { question: 'legacy', answer: 'legacy a' },
    ];

    expect(trimInboxPriorTurns(history)).toEqual([
      { question: 'inbox q', answer: 'inbox a' },
      { question: 'legacy', answer: 'legacy a' },
    ]);
    expect(trimGeneralPriorTurns(history)).toEqual([
      { question: 'general q', answer: 'general a' },
    ]);
  });
});
