export type PushLocale = 'en' | 'ru';

const DEFAULT_LOCALE: PushLocale = 'en';

/** Locales we store on devices and use for push copy selection. */
export const PUSH_LOCALES: readonly PushLocale[] = ['en', 'ru'];

/** Normalize app / device locale to a push bucket (unknown → English). */
export function normalizePushLocale(locale?: string | null): PushLocale {
  return locale === 'ru' ? 'ru' : DEFAULT_LOCALE;
}

function aiCompleteBody(locale: PushLocale, count: number): string {
  if (locale === 'ru') {
    if (count <= 1) return 'ИИ закончил обработку. Откройте, чтобы посмотреть.';
    return `ИИ закончил обработку ${count} записей. Откройте, чтобы посмотреть.`;
  }
  if (count <= 1) return 'AI processing complete. Open to see your notes.';
  return `AI processing complete for ${count} notes. Open to see them.`;
}

export function getPushMessages(
  type: 'ai_complete' | 'policy_update' | 'limit_warning' | 'limit_exceeded',
  locale?: string | null,
  count?: number,
): { title: string; body: string } {
  const loc: PushLocale =
    locale && (PUSH_LOCALES as readonly string[]).includes(locale)
      ? (locale as PushLocale)
      : DEFAULT_LOCALE;

  if (type === 'ai_complete') {
    return { title: 'Voice Inbox AI', body: aiCompleteBody(loc, count ?? 1) };
  }
  if (type === 'policy_update') {
    return {
      title: 'Voice Inbox AI',
      body:
        loc === 'ru'
          ? 'Мы обновили условия. Пожалуйста, ознакомьтесь.'
          : 'We updated our terms. Please review.',
    };
  }
  if (type === 'limit_exceeded') {
    return {
      title: 'Voice Inbox AI',
      body: loc === 'ru' ? 'Недельный лимит ИИ исчерпан.' : 'Weekly AI limit reached.',
    };
  }
  return {
    title: 'Voice Inbox AI',
    body:
      loc === 'ru'
        ? 'Ваш недельный лимит ИИ почти исчерпан.'
        : 'Your weekly AI limit is almost reached.',
  };
}
