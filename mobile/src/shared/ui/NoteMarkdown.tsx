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
  NOTE_MARKDOWN_MD4C_FLAGS,
} from './enrichedMarkdownTheme';

export type NoteMarkdownVariant = 'answer' | 'reasoning' | 'document' | 'digest' | 'push';

type NoteMarkdownProps = {
  color: Colors;
  children: string;
  variant?: NoteMarkdownVariant;
  /** Tail fade-in while markdown grows (e.g. streamed LLM answers). */
  streaming?: boolean;
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
  streaming = false,
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
      flavor={streaming ? 'commonmark' : 'github'}
      markdownStyle={markdownStyle}
      md4cFlags={NOTE_MARKDOWN_MD4C_FLAGS}
      selectionColor={color.accent.primary}
      onLinkPress={handleLinkPress}
      streamingAnimation={streaming}
      allowTrailingMargin
    />
  );
});
