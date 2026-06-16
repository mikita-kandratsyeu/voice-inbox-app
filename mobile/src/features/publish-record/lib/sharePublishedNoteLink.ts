import { Share } from 'react-native';

import { IS_IOS } from '@/shared/lib';

/** Opens the system share sheet for a published note URL (one item, not duplicated on iOS). */
export async function sharePublishedNoteLink(url: string, title: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  try {
    await Share.share(IS_IOS ? { url: trimmed, title } : { message: trimmed, title });
  } catch {
    // User dismissed the share sheet.
  }
}
