import { openInAppBrowser } from '@/features/in-app-browser';
import type { ColorScheme } from '@/shared/config';

import { parseNoteInternalLinkUrl } from './noteInternalLinkScheme';

type CreateNoteMarkdownLinkPressHandlerOptions = {
  browserScheme: ColorScheme;
  onOpenRecord: (recordId: string) => void;
};

export function createNoteMarkdownLinkPressHandler({
  browserScheme,
  onOpenRecord,
}: CreateNoteMarkdownLinkPressHandlerOptions): (event: { url: string }) => void {
  return ({ url }) => {
    const trimmed = url.trim();
    const recordId = parseNoteInternalLinkUrl(trimmed);

    if (recordId) {
      onOpenRecord(recordId);
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      void openInAppBrowser(trimmed, browserScheme);
    }
  };
}
