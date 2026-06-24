import { describe, expect, it } from '@jest/globals';

import {
  buildGeneralAskUserMessageContent,
  estimateGeneralAskRoutingChars,
} from '@/lib/general-ask-user-message';
import { GENERAL_ASK_SYSTEM_PROMPT } from '@/lib/prompts';

describe('general ask user message', () => {
  it('does not include note corpus blocks', () => {
    const content = buildGeneralAskUserMessageContent('What is Kotlin?', [
      { question: 'Earlier?', answer: 'Yes.' },
    ]);

    expect(content).toContain('Question: What is Kotlin?');
    expect(content).toContain('Prior questions and answers in this chat (no note access)');
    expect(content).not.toContain('corpus');
    expect(content).not.toContain('transcript');
  });

  it('estimates routing chars from prompt and user content', () => {
    const chars = estimateGeneralAskRoutingChars('Hello');
    expect(chars).toBe(
      GENERAL_ASK_SYSTEM_PROMPT.length + buildGeneralAskUserMessageContent('Hello').length,
    );
  });
});

describe('GENERAL_ASK_SYSTEM_PROMPT', () => {
  it('does not require evidence or note grounding', () => {
    expect(GENERAL_ASK_SYSTEM_PROMPT).toContain('do NOT have access');
    expect(GENERAL_ASK_SYSTEM_PROMPT).toContain('Do NOT include an "evidence" field');
    expect(GENERAL_ASK_SYSTEM_PROMPT).not.toContain('corpus_note');
  });
});
