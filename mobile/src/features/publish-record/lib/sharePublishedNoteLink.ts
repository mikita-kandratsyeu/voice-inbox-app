import { Share } from 'react-native';

import { i18n } from '@/shared/lib';
import { formatShareExpiresAt } from '@/shared/lib/date';

import { buildPublishedNoteShareMessage } from './buildPublishedNoteShareMessage';

export type SharePublishedNoteLinkInput = {
  url: string;
  title: string;
  expiresAt: string | null;
};

/** Opens the system share sheet with contextual text + link (not a bare URL). */
export async function sharePublishedNoteLink(input: SharePublishedNoteLinkInput): Promise<void> {
  const message = buildPublishedNoteShareMessage({
    title: input.title,
    url: input.url,
    expiresAt: input.expiresAt,
    formatExpiry: (iso) => formatShareExpiresAt(iso, i18n.language),
    t: (key, options) => i18n.t(key, options),
  });
  if (!message) return;

  const shareTitle = input.title.trim() || i18n.t('share.publishShareLink');

  try {
    await Share.share(
      { message, title: shareTitle },
      { dialogTitle: i18n.t('share.publishShareLink') },
    );
  } catch {
    // User dismissed the share sheet.
  }
}
