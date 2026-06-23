import React from 'react';

import type { Colors } from '@/shared/config';
import { NoteMarkdown } from '@/shared/ui/NoteMarkdown';

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
  return (
    <NoteMarkdown color={color} variant={variant}>
      {children}
    </NoteMarkdown>
  );
};
