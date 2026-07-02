export type PublishedNoteShareMessageInput = {
  title: string;
  url: string;
  expiresAt: string | null;
  formatExpiry: (isoDate: string) => string;
  t: (key: string, options?: Record<string, string>) => string;
};

/** Rich share body for messengers (title context + URL, optional expiry). */
export function buildPublishedNoteShareMessage(input: PublishedNoteShareMessageInput): string {
  const url = input.url.trim();
  if (!url) return '';

  const title = input.title.trim() || input.t('share.publishShareLink');
  const lines = [input.t('share.publishShareMessageIntro', { title }), '', url];

  if (input.expiresAt) {
    lines.push('');
    lines.push(
      input.t('share.publishShareMessageExpires', {
        date: input.formatExpiry(input.expiresAt),
      }),
    );
  }

  return lines.join('\n');
}
