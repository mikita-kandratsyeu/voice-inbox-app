/** Strip markdown noise so word count matches “reading” more than raw syntax. */
function markdownToPlainishText(markdown: string): string {
  return (
    markdown
      // fenced code blocks
      .replace(/```[\s\S]*?```/g, ' ')
      // indented code blocks (common in GFM)
      .replace(/^( {4}|\t).+$/gm, ' ')
      // inline code
      .replace(/`[^`\n]+`/g, ' ')
      // images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1 ')
      // links [text](url)
      .replace(/\[([^\]]*)]\([^)]*\)/g, '$1 ')
      // reference-style links [text][ref]
      .replace(/\[([^\]]+)]\s*\[[^\]]*]/g, '$1 ')
      // headings, blockquotes, list markers
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // emphasis / strikethrough markers (keep inner letters)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // table pipes
      .replace(/\|/g, ' ')
      // leftover markup chars
      .replace(/[*_~`#>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Estimated reading time in minutes (at least 1).
 * WPM tuned slightly by locale (Cyrillic lines often scan similarly to Latin at comparable word counts).
 */
export function estimateReadingTimeMinutes(
  markdown: string,
  locale: string,
): number {
  const plain = markdownToPlainishText(markdown);
  const words = countWords(plain);
  const wpm = locale === 'ru' ? 190 : 220;
  return Math.max(1, Math.ceil(words / wpm));
}
