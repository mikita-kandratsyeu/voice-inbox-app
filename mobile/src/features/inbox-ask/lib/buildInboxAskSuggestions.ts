import type { TFunction } from 'i18next';

export function buildInboxAskSuggestions(t: TFunction): Array<{ label: string; prompt: string }> {
  return [
    {
      label: t('inboxAsk.suggestedOpenTasks'),
      prompt: t('inboxAsk.suggestedOpenTasksPrompt'),
    },
    {
      label: t('inboxAsk.suggestedWeekPromises'),
      prompt: t('inboxAsk.suggestedWeekPromisesPrompt'),
    },
    {
      label: t('inboxAsk.suggestedProjectTasks'),
      prompt: t('inboxAsk.suggestedProjectTasksPrompt'),
    },
  ];
}
