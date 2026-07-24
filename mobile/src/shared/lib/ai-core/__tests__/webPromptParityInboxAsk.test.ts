import { WEB_PARITY_INBOX_ASK_SYSTEM_PROMPT } from '../private-remote/webPromptParity';

describe('WEB_PARITY_INBOX_ASK_SYSTEM_PROMPT', () => {
  it('matches web inbox ask guidance including follow-up questions', () => {
    expect(WEB_PARITY_INBOX_ASK_SYSTEM_PROMPT).toContain('suggestedFollowUps');
    expect(WEB_PARITY_INBOX_ASK_SYSTEM_PROMPT).toContain('corpus_note');
    expect(WEB_PARITY_INBOX_ASK_SYSTEM_PROMPT).toContain('interpretations');
  });
});
