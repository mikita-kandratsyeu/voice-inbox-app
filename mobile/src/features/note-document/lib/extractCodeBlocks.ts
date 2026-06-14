/**
 * Extracts code blocks from markdown text
 */

export type CodeBlock = {
  id: string;
  code: string;
  language?: string;
  startIndex: number;
  endIndex: number;
};

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

export function extractCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
    const language = match[1];
    const code = match[2]?.trimEnd() ?? '';
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    blocks.push({
      id: `code-block-${startIndex}`,
      code,
      language,
      startIndex,
      endIndex,
    });
  }

  return blocks;
}

/**
 * Replaces code blocks in markdown with placeholders
 */
export function replaceCodeBlocksWithPlaceholders(markdown: string): {
  processedMarkdown: string;
  codeBlocks: CodeBlock[];
} {
  const codeBlocks = extractCodeBlocks(markdown);
  let processedMarkdown = markdown;
  let offset = 0;

  for (const block of codeBlocks) {
    const placeholder = `\n\n__CODE_BLOCK_${block.id}__\n\n`;
    const before = processedMarkdown.slice(0, block.startIndex - offset);
    const after = processedMarkdown.slice(block.endIndex - offset);

    processedMarkdown = before + placeholder + after;
    offset += block.endIndex - block.startIndex - placeholder.length;
  }

  return { processedMarkdown, codeBlocks };
}
