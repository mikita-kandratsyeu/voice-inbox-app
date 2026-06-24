import { describe, expect, it } from '@jest/globals';

import { WEB_PARITY_GENERAL_ASK_SYSTEM_PROMPT } from '../private-remote/webPromptParity';

describe('WEB_PARITY_GENERAL_ASK_SYSTEM_PROMPT', () => {
  it('matches general ask guidance without evidence', () => {
    expect(WEB_PARITY_GENERAL_ASK_SYSTEM_PROMPT).toContain('suggestedFollowUps');
    expect(WEB_PARITY_GENERAL_ASK_SYSTEM_PROMPT).toContain('Do NOT include an "evidence" field');
    expect(WEB_PARITY_GENERAL_ASK_SYSTEM_PROMPT).not.toContain('corpus_note');
  });
});
