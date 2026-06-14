/**
 * Parse GitHub-style callouts/admonitions from markdown
 * Supports: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
 */

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export type CalloutBlock = {
  type: CalloutType;
  content: string;
  startIndex: number;
  endIndex: number;
  id: string;
};

/**
 * Regex to match GitHub-style callouts:
 * > [!NOTE]
 * > Content line 1
 * > Content line 2
 */
const CALLOUT_REGEX = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:^>.*\n?)*)/gim;

/**
 * Extract callout blocks from markdown
 */
export function extractCallouts(markdown: string): CalloutBlock[] {
  const blocks: CalloutBlock[] = [];
  let match: RegExpExecArray | null;

  // Reset regex
  CALLOUT_REGEX.lastIndex = 0;

  while ((match = CALLOUT_REGEX.exec(markdown)) !== null) {
    const type = match[1]?.toLowerCase() as CalloutType;
    const rawContent = match[2] ?? '';

    // Remove leading '> ' from each line
    const content = rawContent
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim();

    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    blocks.push({
      type,
      content,
      startIndex,
      endIndex,
      id: `callout-${startIndex}`,
    });
  }

  return blocks;
}

/**
 * Remove callouts from markdown and return clean text
 */
export function removeCallouts(markdown: string): string {
  return markdown.replace(CALLOUT_REGEX, '').trim();
}

/**
 * Check if markdown contains callouts
 */
export function hasCallouts(markdown: string): boolean {
  CALLOUT_REGEX.lastIndex = 0;
  return CALLOUT_REGEX.test(markdown);
}

/**
 * Parse markdown into segments with callouts separated
 */
export function splitMarkdownByCallouts(
  markdown: string,
): Array<{ type: 'text'; content: string } | { type: 'callout'; callout: CalloutBlock }> {
  const callouts = extractCallouts(markdown);
  const segments: Array<
    { type: 'text'; content: string } | { type: 'callout'; callout: CalloutBlock }
  > = [];

  if (callouts.length === 0) {
    return [{ type: 'text', content: markdown }];
  }

  let lastIndex = 0;

  for (const callout of callouts) {
    // Add text before callout
    if (callout.startIndex > lastIndex) {
      const textContent = markdown.slice(lastIndex, callout.startIndex).trim();
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // Add callout
    segments.push({ type: 'callout', callout });

    lastIndex = callout.endIndex;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    const textContent = markdown.slice(lastIndex).trim();
    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }
  }

  return segments;
}
