import type { MarkdownStyle, MarkdownTextInputStyle } from 'react-native-enriched-markdown';

import type { Colors } from '@/shared/config';
import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from '@/shared/ui/documentMarkdownTheme';

export function buildNoteDocumentEnrichedMarkdownStyle(color: Colors): MarkdownStyle {
  const accent = color.accent.primary;

  return {
    paragraph: {
      fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
      lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
      color: color.text.primary,
      marginBottom: 14,
    },
    h1: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '700',
      color: color.text.primary,
      marginBottom: 18,
    },
    h2: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: 'bold',
      color: color.text.primary,
      marginTop: 32,
      marginBottom: 12,
    },
    h3: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: 'bold',
      color: color.text.primary,
      marginTop: 22,
      marginBottom: 8,
    },
    strong: {
      fontWeight: 'bold',
      color: color.text.primary,
    },
    em: {
      fontStyle: 'italic',
      color: color.text.secondary,
    },
    strikethrough: {
      color: color.text.secondary,
    },
    link: {
      color: accent,
      underline: true,
    },
    thematicBreak: {
      color: color.border.default,
      height: 1,
      marginTop: 28,
      marginBottom: 28,
    },
    list: {
      fontSize: NOTE_DOCUMENT_BODY_FONT_SIZE,
      lineHeight: NOTE_DOCUMENT_BODY_LINE_HEIGHT,
      color: color.text.primary,
      bulletColor: color.text.primary,
      markerColor: color.text.secondary,
      marginBottom: 14,
    },
    blockquote: {
      borderColor: accent,
      borderWidth: 3,
      backgroundColor: color.background.secondary,
      marginBottom: 14,
    },
    code: {
      fontFamily: 'Menlo',
      fontSize: 15,
      color: color.text.primary,
      backgroundColor: color.background.tertiary,
      borderColor: color.border.default,
    },
    codeBlock: {
      fontFamily: 'Menlo',
      fontSize: 14,
      lineHeight: 22,
      color: color.text.primary,
      backgroundColor: color.background.secondary,
      borderColor: color.border.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    taskList: {
      checkedColor: accent,
      borderColor: color.border.default,
      checkmarkColor: color.background.primary,
      checkedTextColor: color.text.muted,
      checkedStrikethrough: true,
    },
    table: {
      borderColor: color.border.default,
      headerBackgroundColor: color.background.secondary,
      rowEvenBackgroundColor: color.background.primary,
      rowOddBackgroundColor: color.background.secondary,
    },
  };
}

export function buildNoteDocumentEnrichedInputStyle(color: Colors): MarkdownTextInputStyle {
  return {
    strong: { color: color.text.primary },
    em: { color: color.text.secondary },
    link: {
      color: color.accent.primary,
      underline: true,
    },
  };
}
