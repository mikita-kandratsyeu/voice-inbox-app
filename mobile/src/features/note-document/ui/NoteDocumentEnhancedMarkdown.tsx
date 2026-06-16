import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
  type TaskListItemPressEvent,
} from 'react-native-enriched-markdown';

import {
  createNoteMarkdownLinkPressHandler,
  transformWikiLinksForRender,
  type WikiLinkResolvableRecord,
} from '@/features/note-links';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';

import type { CalloutBlock } from '../lib/parseCallouts';
import { extractCallouts } from '../lib/parseCallouts';
import { NoteDocumentCallout } from './NoteDocumentCallout';
import { NoteDocumentCodeBlock } from './NoteDocumentCodeBlock';

type NoteDocumentEnhancedMarkdownProps = {
  color: Colors;
  markdown: string;
  markdownStyle: MarkdownStyle;
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[];
  onOpenRecord?: (recordId: string) => void;
  onTaskListItemPress?: (event: TaskListItemPressEvent) => void;
};

type MarkdownSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'callout'; callout: CalloutBlock };

/**
 * Splits markdown into text, code block, and callout segments
 */
function splitMarkdownByCodeBlocksAndCallouts(markdown: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];

  // First extract callouts
  const callouts = extractCallouts(markdown);
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  // Build list of all special blocks (code + callouts)
  type SpecialBlock =
    | { type: 'code'; start: number; end: number; language?: string; code: string }
    | { type: 'callout'; start: number; end: number; callout: CalloutBlock };

  const specialBlocks: SpecialBlock[] = [
    ...callouts.map((c) => ({
      type: 'callout' as const,
      start: c.startIndex,
      end: c.endIndex,
      callout: c,
    })),
  ];

  // Add code blocks
  let match: RegExpExecArray | null;
  codeBlockRegex.lastIndex = 0;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    specialBlocks.push({
      type: 'code',
      start: match.index,
      end: match.index + match[0].length,
      language: match[1],
      code: match[2]?.trimEnd() ?? '',
    });
  }

  // Sort by start position
  specialBlocks.sort((a, b) => a.start - b.start);

  // Build segments
  let lastIndex = 0;
  for (const block of specialBlocks) {
    // Add text before block
    if (block.start > lastIndex) {
      const textContent = markdown.slice(lastIndex, block.start).trim();
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // Add special block
    if (block.type === 'code') {
      segments.push({
        type: 'code',
        code: block.code,
        language: block.language,
      });
    } else {
      segments.push({
        type: 'callout',
        callout: block.callout,
      });
    }

    lastIndex = block.end;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    const textContent = markdown.slice(lastIndex).trim();
    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: markdown }];
}

function useRenderedMarkdown(
  markdown: string,
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[],
): string {
  return useMemo(() => {
    if (!wikiLinkRecords?.length) return markdown;
    return transformWikiLinksForRender(markdown, wikiLinkRecords);
  }, [markdown, wikiLinkRecords]);
}

export const NoteDocumentEnhancedMarkdown = React.memo(function NoteDocumentEnhancedMarkdown({
  color,
  markdown,
  markdownStyle,
  wikiLinkRecords,
  onOpenRecord,
  onTaskListItemPress,
}: NoteDocumentEnhancedMarkdownProps) {
  const browserScheme = useAppTheme();
  const renderedMarkdown = useRenderedMarkdown(markdown, wikiLinkRecords);

  const handleLinkPress = useCallback(
    createNoteMarkdownLinkPressHandler({
      browserScheme,
      onOpenRecord: onOpenRecord ?? (() => {}),
    }),
    [browserScheme, onOpenRecord],
  );

  const disableLinkPreview = Boolean(onOpenRecord);

  const segments = useMemo(
    () => splitMarkdownByCodeBlocksAndCallouts(renderedMarkdown),
    [renderedMarkdown],
  );

  // If no code blocks, render normally
  if (segments.length === 0 || segments.every((s) => s.type === 'text')) {
    return (
      <EnrichedMarkdownText
        markdown={renderedMarkdown}
        flavor="github"
        markdownStyle={markdownStyle}
        selectionColor={color.accent.primary}
        onLinkPress={handleLinkPress}
        enableLinkPreview={!disableLinkPreview}
        onTaskListItemPress={onTaskListItemPress}
        allowTrailingMargin
      />
    );
  }

  // Render segments with custom code blocks and callouts
  return (
    <View>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return (
            <NoteDocumentCodeBlock
              key={`code-${index}`}
              code={segment.code}
              language={segment.language}
              color={color}
              enableSyntaxHighlighting
            />
          );
        }

        if (segment.type === 'callout') {
          const calloutMarkdown = wikiLinkRecords?.length
            ? transformWikiLinksForRender(segment.callout.content, wikiLinkRecords)
            : segment.callout.content;

          return (
            <NoteDocumentCallout
              key={`callout-${index}`}
              type={segment.callout.type}
              content={segment.callout.content}
              color={color}
            >
              <EnrichedMarkdownText
                markdown={calloutMarkdown}
                flavor="github"
                markdownStyle={{
                  ...markdownStyle,
                  paragraph: {
                    ...markdownStyle.paragraph,
                    marginBottom: 4,
                  },
                }}
                selectionColor={color.accent.primary}
                onLinkPress={handleLinkPress}
                enableLinkPreview={!disableLinkPreview}
                allowTrailingMargin={false}
              />
            </NoteDocumentCallout>
          );
        }

        return (
          <EnrichedMarkdownText
            key={`text-${index}`}
            markdown={segment.content}
            flavor="github"
            markdownStyle={markdownStyle}
            selectionColor={color.accent.primary}
            onLinkPress={handleLinkPress}
            enableLinkPreview={!disableLinkPreview}
            onTaskListItemPress={onTaskListItemPress}
            allowTrailingMargin
          />
        );
      })}
    </View>
  );
});
