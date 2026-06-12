import type { TextStyle, ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';

const BODY_FONT_SIZE = 17;
const BODY_LINE_HEIGHT = 28;

export const NOTE_DOCUMENT_BODY_FONT_SIZE = BODY_FONT_SIZE;
export const NOTE_DOCUMENT_BODY_LINE_HEIGHT = BODY_LINE_HEIGHT;

export function getDocumentSectionHeadingStyle(color: Colors): TextStyle {
  return {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.3,
    marginTop: 28,
    marginBottom: 12,
  };
}

type MarkdownStyleMap = Record<string, TextStyle | ViewStyle>;

/** Editorial document typography — single accent, theme tokens, Obsidian/Bear-like rhythm. */
export function getNoteDocumentMarkdownStyles(color: Colors): MarkdownStyleMap {
  const accent = color.accent.primary;

  return {
    body: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      marginBottom: 0,
    },
    text: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
    },
    paragraph: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      marginTop: 0,
      marginBottom: 14,
    },
    heading1: {
      color: color.text.primary,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.6,
      marginTop: 0,
      marginBottom: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: color.border.default,
    },
    heading2: {
      ...getDocumentSectionHeadingStyle(color),
      marginTop: 32,
    },
    heading3: {
      color: color.text.primary,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
      letterSpacing: -0.2,
      marginTop: 22,
      marginBottom: 8,
    },
    heading4: {
      color: color.text.primary,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      marginTop: 18,
      marginBottom: 6,
    },
    heading5: {
      color: color.text.secondary,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      marginTop: 14,
      marginBottom: 4,
    },
    heading6: {
      color: color.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    strong: {
      color: color.text.primary,
      fontWeight: '600',
    },
    em: {
      color: color.text.secondary,
      fontStyle: 'italic',
    },
    s: {
      color: color.text.secondary,
      textDecorationLine: 'line-through',
    },
    link: {
      color: accent,
      textDecorationLine: 'underline',
      fontWeight: '500',
    },
    hr: {
      backgroundColor: color.border.default,
      height: 1,
      marginVertical: 28,
    },
    bullet_list: {
      marginTop: 4,
      marginBottom: 14,
    },
    ordered_list: {
      marginTop: 4,
      marginBottom: 14,
    },
    list_item: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      marginBottom: 8,
      flexDirection: 'row',
    },
    bullet_list_icon: {
      color: color.text.primary,
      fontSize: 20,
      lineHeight: BODY_LINE_HEIGHT,
      fontWeight: '800',
      marginLeft: 2,
      marginRight: 8,
    },
    bullet_list_content: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      flex: 1,
    },
    ordered_list_icon: {
      color: color.text.secondary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      fontWeight: '600',
      marginRight: 10,
      minWidth: 20,
    },
    ordered_list_content: {
      color: color.text.primary,
      fontSize: BODY_FONT_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      flex: 1,
    },
    code_inline: {
      backgroundColor: color.background.tertiary,
      color: color.text.primary,
      borderRadius: 6,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontFamily: 'Menlo',
    },
    fence: {
      backgroundColor: color.background.secondary,
      borderRadius: 12,
      padding: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: color.border.default,
    },
    code_block: {
      color: color.text.primary,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: 'Menlo',
    },
    blockquote: {
      backgroundColor: color.background.secondary,
      borderLeftColor: accent,
      borderLeftWidth: 3,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 14,
      borderRadius: 8,
    },
    table: {
      borderWidth: 1,
      borderColor: color.border.default,
      borderRadius: 12,
      marginVertical: 16,
      overflow: 'hidden',
    },
    thead: {
      backgroundColor: color.background.secondary,
    },
    tbody: {
      backgroundColor: color.background.primary,
    },
    th: {
      color: color.text.primary,
      fontSize: 15,
      fontWeight: '600',
      padding: 12,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: color.border.default,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: color.border.default,
    },
    td: {
      color: color.text.primary,
      fontSize: 15,
      lineHeight: 22,
      padding: 12,
      borderRightWidth: 1,
      borderColor: color.border.default,
    },
  };
}
