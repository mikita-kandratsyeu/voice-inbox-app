import React, { useCallback, useMemo } from 'react';
import { EnrichedMarkdownText, type TaskListItemPressEvent } from 'react-native-enriched-markdown';

import { openInAppBrowser } from '@/features/in-app-browser';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';

import { buildNoteDocumentEnrichedMarkdownStyle } from '../lib/enrichedMarkdownTheme';

type NoteDocumentEnrichedMarkdownProps = {
  color: Colors;
  markdown: string;
  onTaskListItemPress?: (event: TaskListItemPressEvent) => void;
};

export const NoteDocumentEnrichedMarkdown = React.memo(function NoteDocumentEnrichedMarkdown({
  color,
  markdown,
  onTaskListItemPress,
}: NoteDocumentEnrichedMarkdownProps) {
  const browserScheme = useAppTheme();
  const markdownStyle = useMemo(() => buildNoteDocumentEnrichedMarkdownStyle(color), [color]);

  const handleLinkPress = useCallback(
    ({ url }: { url: string }) => {
      const trimmed = url.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return;
      }
      void openInAppBrowser(trimmed, browserScheme);
    },
    [browserScheme],
  );

  if (!markdown.trim()) {
    return null;
  }

  return (
    <EnrichedMarkdownText
      markdown={markdown}
      flavor="github"
      markdownStyle={markdownStyle}
      selectionColor={color.accent.primary}
      onLinkPress={handleLinkPress}
      onTaskListItemPress={onTaskListItemPress}
      allowTrailingMargin
    />
  );
});
