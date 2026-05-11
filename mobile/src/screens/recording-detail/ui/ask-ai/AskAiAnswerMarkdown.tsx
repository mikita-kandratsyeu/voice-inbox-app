import React, { useCallback, useMemo } from 'react';
import Markdown from 'react-native-markdown-display';

import { openInAppBrowser } from '@/features/in-app-browser';
import { type Colors, useAppTheme } from '@/shared/config';

type AskAiAnswerMarkdownProps = {
  color: Colors;
  children: string;
};

export const AskAiAnswerMarkdown = ({ color, children }: AskAiAnswerMarkdownProps) => {
  const browserScheme = useAppTheme();

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
        marginBottom: 0,
      },
      text: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
      },
      paragraph: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
        marginTop: 0,
        marginBottom: 8,
      },
      heading1: {
        color: color.text.primary,
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '600' as const,
        marginTop: 4,
        marginBottom: 8,
      },
      heading2: {
        color: color.text.primary,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '600' as const,
        marginTop: 8,
        marginBottom: 6,
      },
      heading3: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600' as const,
        marginTop: 6,
        marginBottom: 4,
      },
      strong: {
        color: color.text.primary,
        fontWeight: '600' as const,
      },
      em: {
        color: color.text.primary,
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
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
        marginBottom: 4,
      },
      bullet_list_icon: {
        color: color.accent.primary,
        fontSize: 16,
        lineHeight: 28,
      },
      bullet_list_content: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
      },
      ordered_list_icon: {
        color: color.accent.primary,
        fontSize: 16,
        lineHeight: 28,
      },
      ordered_list_content: {
        color: color.text.primary,
        fontSize: 16,
        lineHeight: 28,
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
    [color],
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
