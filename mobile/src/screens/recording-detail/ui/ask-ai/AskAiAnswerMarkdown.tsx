import React, { useCallback, useMemo } from 'react';
import Markdown from 'react-native-markdown-display';

import { openInAppBrowser } from '@/features/in-app-browser';
import { type Colors, useAppTheme } from '@/shared/config';

type AskAiAnswerMarkdownProps = {
  color: Colors;
  children: string;
  /** Compact secondary text for summary reasoning and similar disclosures. */
  variant?: 'answer' | 'reasoning';
};

export const AskAiAnswerMarkdown = ({
  color,
  children,
  variant = 'answer',
}: AskAiAnswerMarkdownProps) => {
  const browserScheme = useAppTheme();
  const isReasoning = variant === 'reasoning';
  const textColor = isReasoning ? color.text.secondary : color.text.primary;
  const fontSize = isReasoning ? 13 : 16;
  const lineHeight = isReasoning ? 20 : 28;

  const markdownStyles = useMemo(
    () => ({
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
        fontWeight: '600' as const,
        marginTop: isReasoning ? 2 : 4,
        marginBottom: isReasoning ? 6 : 8,
      },
      heading2: {
        color: textColor,
        fontSize: isReasoning ? 14 : 17,
        lineHeight: isReasoning ? 20 : 24,
        fontWeight: '600' as const,
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
        fontWeight: '600' as const,
      },
      em: {
        color: textColor,
        fontStyle: 'italic' as const,
      },
      link: {
        color: color.accent.primary,
        textDecorationLine: 'underline' as const,
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
      },
      ordered_list_content: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      code_inline: {
        backgroundColor: color.background.tertiary,
        color: color.text.primary,
        borderRadius: 4,
        fontSize: 15,
        paddingHorizontal: 4,
        paddingVertical: 2,
      },
      fence: {
        backgroundColor: color.background.tertiary,
        borderRadius: 8,
        padding: 12,
        marginVertical: 6,
      },
      code_block: {
        color: color.text.primary,
        fontSize: 14,
        lineHeight: 22,
      },
      blockquote: {
        backgroundColor: color.background.tertiary,
        borderLeftColor: color.accent.primary,
        borderLeftWidth: 3,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginVertical: 6,
        borderRadius: 4,
      },
    }),
    [color, fontSize, isReasoning, lineHeight, textColor],
  );

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
