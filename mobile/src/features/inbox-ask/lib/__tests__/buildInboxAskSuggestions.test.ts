import type { TFunction } from 'i18next';

import { buildInboxAskSuggestions } from '../buildInboxAskSuggestions';

describe('buildInboxAskSuggestions', () => {
  it('maps i18n keys to label/prompt pairs', () => {
    const t = ((key: string) => key) as TFunction;

    expect(buildInboxAskSuggestions(t)).toEqual([
      {
        label: 'inboxAsk.suggestedOpenTasks',
        prompt: 'inboxAsk.suggestedOpenTasksPrompt',
      },
      {
        label: 'inboxAsk.suggestedWeekPromises',
        prompt: 'inboxAsk.suggestedWeekPromisesPrompt',
      },
      {
        label: 'inboxAsk.suggestedProjectTasks',
        prompt: 'inboxAsk.suggestedProjectTasksPrompt',
      },
    ]);
  });
});
