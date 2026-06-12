import React, { useCallback, useMemo } from 'react';
import Markdown from 'react-native-markdown-display';

import { openInAppBrowser } from '@/features/in-app-browser';
import { type Colors, useAppTheme } from '@/shared/config';

import { getNoteDocumentMarkdownStyles } from './documentMarkdownTheme';

export type NoteMarkdownVariant = 'answer' | 'reasoning' | 'document';

type NoteMarkdownProps = {
  color: Colors;
  children: string;
  variant?: NoteMarkdownVariant;
};

export const NoteMarkdown = ({ color, children, variant = 'answer' }: NoteMarkdownProps) => {
  const browserScheme = useAppTheme();
  const isReasoning = variant === 'reasoning';
  const isDocument = variant === 'document';
  const textColor = isReasoning ? color.text.secondary : color.text.primary;
  const fontSize = isReasoning ? 13 : isDocument ? 17 : 16;
  const lineHeight = isReasoning ? 20 : isDocument ? 28 : 28;

  const markdownStyles = useMemo(() => {
    if (isDocument) {
      return getNoteDocumentMarkdownStyles(color);
    }

    return {
      body: {
        color: textColor,
        fontSize,
        lineHeight,
        marginBottom: 0,
      },
      text: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      paragraph: {
        color: textColor,
        fontSize,
        lineHeight,
        marginTop: 0,
        marginBottom: isReasoning ? 6 : 8,
      },
      heading1: {
        color: textColor,
        fontSize: isReasoning ? 15 : 18,
        lineHeight: isReasoning ? 22 : 26,
        fontWeight: '700' as const,
        marginTop: isReasoning ? 2 : 4,
        marginBottom: isReasoning ? 6 : 8,
      },
      heading2: {
        color: textColor,
        fontSize: isReasoning ? 14 : 17,
        lineHeight: isReasoning ? 20 : 24,
        fontWeight: '700' as const,
        marginTop: isReasoning ? 4 : 8,
        marginBottom: isReasoning ? 4 : 6,
      },
      heading3: {
        color: textColor,
        fontSize: isReasoning ? 13 : 16,
        lineHeight: isReasoning ? 20 : 24,
        fontWeight: '600' as const,
        marginTop: isReasoning ? 4 : 6,
        marginBottom: isReasoning ? 2 : 4,
      },
      strong: {
        color: isReasoning ? color.text.primary : textColor,
        fontWeight: '700' as const,
      },
      em: {
        color: textColor,
        fontStyle: 'italic' as const,
      },
      link: {
        color: color.accent.primary,
        textDecorationLine: 'underline' as const,
        fontWeight: '500' as const,
      },
      hr: {
        backgroundColor: color.border.default,
        height: 2,
        marginVertical: 12,
      },
      bullet_list: {
        marginTop: 4,
        marginBottom: 4,
      },
      ordered_list: {
        marginTop: 4,
        marginBottom: 4,
      },
      list_item: {
        color: textColor,
        fontSize,
        lineHeight,
        marginBottom: isReasoning ? 2 : 4,
      },
      bullet_list_icon: {
        color: color.accent.primary,
        fontSize,
        lineHeight,
        marginRight: 8,
      },
      bullet_list_content: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      ordered_list_icon: {
        color: color.accent.primary,
        fontSize,
        lineHeight,
        fontWeight: '700' as const,
        marginRight: 8,
      },
      ordered_list_content: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      code_inline: {
        backgroundColor: color.background.tertiary,
        color: color.accent.primary,
        borderRadius: 4,
        fontSize: 15,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontFamily: 'Menlo',
      },
      fence: {
        backgroundColor: color.background.tertiary,
        borderRadius: 8,
        padding: 12,
        marginVertical: 6,
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
        borderLeftColor: color.accent.primary,
        borderLeftWidth: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginVertical: 6,
        borderRadius: 6,
      },
    };
  }, [color, fontSize, isDocument, isReasoning, lineHeight, textColor]);

  const onLinkPress = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
      void openInAppBrowser(trimmed, browserScheme);
      return true;
    },
    [browserScheme],
  );

  return (
    <Markdown style={markdownStyles} onLinkPress={onLinkPress}>
      {children}
    </Markdown>
  );
};
