import type { AskPriorTurn } from '@/shared/lib/ai-core';

import type { InboxAskHistoryItem, InboxAskTurnMode } from '../model/useInboxAsk';

export function normalizeInboxAskTurnMode(turn: InboxAskHistoryItem): InboxAskTurnMode {
  return turn.mode === 'general' ? 'general' : 'inbox';
}

export function trimInboxPriorTurns(history: InboxAskHistoryItem[]): AskPriorTurn[] {
  return history
    .filter((turn) => normalizeInboxAskTurnMode(turn) === 'inbox')
    .slice(-6)
    .map((turn) => ({
      question: turn.question.slice(0, 800),
      answer: turn.answer.slice(0, 2000),
    }));
}

export function trimGeneralPriorTurns(history: InboxAskHistoryItem[]): AskPriorTurn[] {
  return history
    .filter((turn) => normalizeInboxAskTurnMode(turn) === 'general')
    .slice(-6)
    .map((turn) => ({
      question: turn.question.slice(0, 800),
      answer: turn.answer.slice(0, 2000),
    }));
}
