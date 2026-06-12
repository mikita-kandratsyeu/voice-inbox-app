import React, { useCallback, useMemo } from 'react';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';

import { openInAppBrowser } from '@/features/in-app-browser';
import { type Colors, useAppTheme } from '@/shared/config';

import {
  buildDigestEnrichedMarkdownStyle,
  buildNoteDocumentEnrichedMarkdownStyle,
  buildNoteMarkdownAnswerStyle,
  buildNoteMarkdownReasoningStyle,
  buildPushSheetEnrichedMarkdownStyle,
} from './enrichedMarkdownTheme';

export type NoteMarkdownVariant = 'answer' | 'reasoning' | 'document' | 'digest' | 'push';

type NoteMarkdownProps = {
  color: Colors;
  children: string;
  variant?: NoteMarkdownVariant;
};

function buildMarkdownStyle(color: Colors, variant: NoteMarkdownVariant) {
  switch (variant) {
    case 'document':
      return buildNoteDocumentEnrichedMarkdownStyle(color);
    case 'reasoning':
      return buildNoteMarkdownReasoningStyle(color);
    case 'digest':
      return buildDigestEnrichedMarkdownStyle(color);
    case 'push':
      return buildPushSheetEnrichedMarkdownStyle(color);
    default:
      return buildNoteMarkdownAnswerStyle(color);
  }
}

export const NoteMarkdown = React.memo(function NoteMarkdown({
  color,
  children,
  variant = 'answer',
}: NoteMarkdownProps) {
  const browserScheme = useAppTheme();
  const markdownStyle = useMemo(() => buildMarkdownStyle(color, variant), [color, variant]);

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

  if (!children.trim()) {
    return null;
  }

  return (
    <EnrichedMarkdownText
      markdown={children}
      flavor="github"
      markdownStyle={markdownStyle}
      selectionColor={color.accent.primary}
      onLinkPress={handleLinkPress}
      allowTrailingMargin
    />
  );
});
