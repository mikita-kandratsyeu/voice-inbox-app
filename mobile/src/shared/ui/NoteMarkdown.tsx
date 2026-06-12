import React, { useCallback, useMemo } from 'react';
import Markdown from 'react-native-markdown-display';

import { openInAppBrowser } from '@/features/in-app-browser';
import { type Colors, useAppTheme } from '@/shared/config';

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

  const accentColors = useMemo(
    () => ({
      h1: color.accent.primary,
      h2: '#FF6B6B',
      h3: '#4ECDC4',
      h4: '#FFD93D',
      h5: '#A78BFA',
      h6: '#FB923C',
      listBullet: '#22C55E',
      listOrdered: '#3B82F6',
      link: '#60A5FA',
      code: '#F472B6',
      quote: '#8B5CF6',
    }),
    [color.accent.primary],
  );

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
        marginBottom: isReasoning ? 6 : isDocument ? 16 : 8,
      },
      heading1: {
        color: isDocument ? accentColors.h1 : textColor,
        fontSize: isDocument ? 32 : isReasoning ? 15 : 18,
        lineHeight: isDocument ? 40 : isReasoning ? 22 : 26,
        fontWeight: '700' as const,
        marginTop: isDocument ? 24 : isReasoning ? 2 : 4,
        marginBottom: isDocument ? 16 : isReasoning ? 6 : 8,
        borderBottomWidth: isDocument ? 2 : 0,
        borderBottomColor: isDocument ? `${accentColors.h1}40` : undefined,
        paddingBottom: isDocument ? 12 : 0,
      },
      heading2: {
        color: isDocument ? accentColors.h2 : textColor,
        fontSize: isDocument ? 26 : isReasoning ? 14 : 17,
        lineHeight: isDocument ? 34 : isReasoning ? 20 : 24,
        fontWeight: '700' as const,
        marginTop: isDocument ? 20 : isReasoning ? 4 : 8,
        marginBottom: isDocument ? 12 : isReasoning ? 4 : 6,
        borderBottomWidth: isDocument ? 1 : 0,
        borderBottomColor: isDocument ? `${accentColors.h2}30` : undefined,
        paddingBottom: isDocument ? 8 : 0,
      },
      heading3: {
        color: isDocument ? accentColors.h3 : textColor,
        fontSize: isDocument ? 22 : isReasoning ? 13 : 16,
        lineHeight: isDocument ? 30 : isReasoning ? 20 : 24,
        fontWeight: '600' as const,
        marginTop: isDocument ? 16 : isReasoning ? 4 : 6,
        marginBottom: isDocument ? 10 : isReasoning ? 2 : 4,
      },
      heading4: {
        color: isDocument ? accentColors.h4 : textColor,
        fontSize: isDocument ? 19 : 15,
        lineHeight: isDocument ? 26 : 22,
        fontWeight: '600' as const,
        marginTop: isDocument ? 14 : 6,
        marginBottom: isDocument ? 8 : 4,
      },
      heading5: {
        color: isDocument ? accentColors.h5 : textColor,
        fontSize: isDocument ? 17 : 14,
        lineHeight: isDocument ? 24 : 20,
        fontWeight: '600' as const,
        marginTop: isDocument ? 12 : 4,
        marginBottom: isDocument ? 6 : 2,
      },
      heading6: {
        color: isDocument ? accentColors.h6 : textColor,
        fontSize: isDocument ? 16 : 13,
        lineHeight: isDocument ? 22 : 18,
        fontWeight: '600' as const,
        marginTop: isDocument ? 10 : 4,
        marginBottom: isDocument ? 6 : 2,
      },
      strong: {
        color: isReasoning ? color.text.primary : isDocument ? accentColors.h1 : textColor,
        fontWeight: '700' as const,
      },
      em: {
        color: isDocument ? accentColors.h5 : textColor,
        fontStyle: 'italic' as const,
      },
      link: {
        color: isDocument ? accentColors.link : color.accent.primary,
        textDecorationLine: 'underline' as const,
        fontWeight: '500' as const,
      },
      hr: {
        backgroundColor: isDocument ? accentColors.h1 : color.border.default,
        height: isDocument ? 3 : 2,
        marginVertical: isDocument ? 24 : 12,
        opacity: isDocument ? 0.3 : 1,
      },
      bullet_list: {
        marginTop: isDocument ? 8 : 4,
        marginBottom: isDocument ? 12 : 4,
      },
      ordered_list: {
        marginTop: isDocument ? 8 : 4,
        marginBottom: isDocument ? 12 : 4,
      },
      list_item: {
        color: textColor,
        fontSize,
        lineHeight,
        marginBottom: isReasoning ? 2 : isDocument ? 6 : 4,
      },
      bullet_list_icon: {
        color: isDocument ? accentColors.listBullet : color.accent.primary,
        fontSize: isDocument ? 12 : fontSize,
        lineHeight,
        marginLeft: 0,
        marginRight: isDocument ? 12 : 8,
        fontWeight: '700' as const,
      },
      bullet_list_content: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      ordered_list_icon: {
        color: isDocument ? accentColors.listOrdered : color.accent.primary,
        fontSize,
        lineHeight,
        fontWeight: '700' as const,
        marginRight: isDocument ? 12 : 8,
      },
      ordered_list_content: {
        color: textColor,
        fontSize,
        lineHeight,
      },
      code_inline: {
        backgroundColor: isDocument ? `${accentColors.code}20` : color.background.tertiary,
        color: isDocument ? accentColors.code : color.accent.primary,
        borderRadius: 4,
        fontSize: isDocument ? 16 : 15,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontFamily: 'Menlo',
        fontWeight: '600' as const,
      },
      fence: {
        backgroundColor: isDocument ? `${accentColors.h3}10` : color.background.tertiary,
        borderRadius: 8,
        padding: isDocument ? 16 : 12,
        marginVertical: isDocument ? 12 : 6,
        borderWidth: 1,
        borderColor: isDocument ? `${accentColors.h3}40` : color.border.default,
      },
      code_block: {
        color: isDocument ? accentColors.h3 : color.text.primary,
        fontSize: isDocument ? 15 : 14,
        lineHeight: isDocument ? 24 : 22,
        fontFamily: 'Menlo',
      },
      blockquote: {
        backgroundColor: isDocument ? `${accentColors.quote}15` : color.background.secondary,
        borderLeftColor: isDocument ? accentColors.quote : color.accent.primary,
        borderLeftWidth: 4,
        paddingHorizontal: isDocument ? 16 : 12,
        paddingVertical: isDocument ? 12 : 6,
        marginVertical: isDocument ? 12 : 6,
        borderRadius: 6,
      },
      table: {
        borderWidth: 1,
        borderColor: isDocument ? `${accentColors.h1}30` : color.border.default,
        borderRadius: 8,
        marginVertical: isDocument ? 12 : 6,
        overflow: 'hidden' as const,
      },
      thead: {
        backgroundColor: isDocument ? `${accentColors.h1}15` : color.background.secondary,
      },
      tbody: {
        backgroundColor: color.background.primary,
      },
      th: {
        color: isDocument ? accentColors.h1 : color.text.primary,
        fontSize: isDocument ? 16 : 15,
        fontWeight: '700' as const,
        padding: isDocument ? 12 : 8,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: isDocument ? `${accentColors.h1}20` : color.border.default,
      },
      tr: {
        borderBottomWidth: 1,
        borderColor: color.border.default,
      },
      td: {
        color: textColor,
        fontSize: isDocument ? 16 : 15,
        padding: isDocument ? 12 : 8,
        borderRightWidth: 1,
        borderColor: isDocument ? `${accentColors.h1}10` : color.border.default,
      },
    }),
    [accentColors, color, fontSize, isDocument, isReasoning, lineHeight, textColor],
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
