import type { MarkdownStyle, MarkdownTextInputStyle } from 'react-native-enriched-markdown';

import type { Colors } from '@/shared/config';

import {
  NOTE_DOCUMENT_BODY_FONT_SIZE,
  NOTE_DOCUMENT_BODY_LINE_HEIGHT,
} from './documentMarkdownTheme';

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
      fontWeight: 'bold',
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

function buildChatMarkdownStyle(
  color: Colors,
  options: {
    textColor: string;
    fontSize: number;
    lineHeight: number;
    paragraphMarginBottom: number;
    heading1Size: number;
    heading1LineHeight: number;
    heading2Size: number;
    heading2LineHeight: number;
    heading3Size: number;
    heading3LineHeight: number;
    strongColor?: string;
    listMarginBottom?: number;
  },
): MarkdownStyle {
  const accent = color.accent.primary;
  const {
    textColor,
    fontSize,
    lineHeight,
    paragraphMarginBottom,
    heading1Size,
    heading1LineHeight,
    heading2Size,
    heading2LineHeight,
    heading3Size,
    heading3LineHeight,
    strongColor = textColor,
    listMarginBottom = 4,
  } = options;

  return {
    paragraph: {
      color: textColor,
      fontSize,
      lineHeight,
      marginBottom: paragraphMarginBottom,
    },
    h1: {
      color: textColor,
      fontSize: heading1Size,
      lineHeight: heading1LineHeight,
      fontWeight: 'bold',
      marginBottom: paragraphMarginBottom,
    },
    h2: {
      color: textColor,
      fontSize: heading2Size,
      lineHeight: heading2LineHeight,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: Math.max(4, paragraphMarginBottom - 2),
    },
    h3: {
      color: textColor,
      fontSize: heading3Size,
      lineHeight: heading3LineHeight,
      fontWeight: 'bold',
      marginTop: 6,
      marginBottom: Math.max(2, paragraphMarginBottom - 4),
    },
    strong: {
      color: strongColor,
      fontWeight: 'bold',
    },
    em: {
      color: textColor,
      fontStyle: 'italic',
    },
    link: {
      color: accent,
      underline: true,
    },
    thematicBreak: {
      color: color.border.default,
      height: 2,
      marginTop: 12,
      marginBottom: 12,
    },
    list: {
      color: textColor,
      fontSize,
      lineHeight,
      bulletColor: accent,
      markerColor: accent,
      marginTop: 4,
      marginBottom: listMarginBottom,
    },
    blockquote: {
      borderColor: accent,
      borderWidth: 3,
      backgroundColor: color.background.secondary,
      marginBottom: 6,
    },
    code: {
      fontFamily: 'Menlo',
      fontSize: 15,
      color: accent,
      backgroundColor: color.background.tertiary,
      borderColor: color.border.default,
    },
    codeBlock: {
      fontFamily: 'Menlo',
      fontSize: 14,
      lineHeight: 22,
      color: color.text.primary,
      backgroundColor: color.background.tertiary,
      borderColor: color.border.default,
      borderRadius: 8,
      padding: 12,
      marginBottom: 6,
    },
    table: {
      borderColor: color.border.default,
      headerBackgroundColor: color.background.secondary,
      rowEvenBackgroundColor: color.background.primary,
      rowOddBackgroundColor: color.background.secondary,
    },
  };
}

export function buildNoteMarkdownAnswerStyle(color: Colors): MarkdownStyle {
  return buildChatMarkdownStyle(color, {
    textColor: color.text.primary,
    fontSize: 16,
    lineHeight: 28,
    paragraphMarginBottom: 8,
    heading1Size: 18,
    heading1LineHeight: 26,
    heading2Size: 17,
    heading2LineHeight: 24,
    heading3Size: 16,
    heading3LineHeight: 24,
  });
}

export function buildNoteMarkdownReasoningStyle(color: Colors): MarkdownStyle {
  return buildChatMarkdownStyle(color, {
    textColor: color.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    paragraphMarginBottom: 6,
    heading1Size: 15,
    heading1LineHeight: 22,
    heading2Size: 14,
    heading2LineHeight: 20,
    heading3Size: 13,
    heading3LineHeight: 20,
    strongColor: color.text.primary,
    listMarginBottom: 4,
  });
}

export function buildDigestEnrichedMarkdownStyle(color: Colors): MarkdownStyle {
  return buildChatMarkdownStyle(color, {
    textColor: color.text.primary,
    fontSize: 14,
    lineHeight: 22,
    paragraphMarginBottom: 6,
    heading1Size: 16,
    heading1LineHeight: 22,
    heading2Size: 14,
    heading2LineHeight: 20,
    heading3Size: 14,
    heading3LineHeight: 20,
    listMarginBottom: 16,
  });
}

export function buildPushSheetEnrichedMarkdownStyle(color: Colors): MarkdownStyle {
  return buildChatMarkdownStyle(color, {
    textColor: color.text.secondary,
    fontSize: 14,
    lineHeight: 22,
    paragraphMarginBottom: 6,
    heading1Size: 17,
    heading1LineHeight: 24,
    heading2Size: 15,
    heading2LineHeight: 22,
    heading3Size: 14,
    heading3LineHeight: 22,
    strongColor: color.text.primary,
    listMarginBottom: 4,
  });
}
