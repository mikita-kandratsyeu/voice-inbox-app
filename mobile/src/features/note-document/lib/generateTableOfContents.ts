/**
 * Generates a table of contents from markdown headings
 */

export type TocItem = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  position: number;
};

/**
 * Extract headings from markdown and generate TOC
 */
export function generateTableOfContents(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1]?.length as TocItem['level'];
    const title = match[2]?.trim() ?? '';
    const position = match.index;

    // Generate unique ID from title
    const id = generateHeadingId(title, items.length);

    items.push({
      id,
      level,
      title,
      position,
    });
  }

  return items;
}

/**
 * Generate a unique ID for a heading
 */
function generateHeadingId(title: string, index: number): string {
  // Convert title to kebab-case
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens

  return slug ? `${slug}-${index}` : `heading-${index}`;
}

/**
 * Get line number for a position in markdown
 */
export function getLineNumberForPosition(markdown: string, position: number): number {
  const beforePosition = markdown.slice(0, position);
  return beforePosition.split('\n').length;
}

/**
 * Check if markdown has enough headings for TOC
 */
export function shouldShowTableOfContents(markdown: string, minHeadings: number = 3): boolean {
  const toc = generateTableOfContents(markdown);
  return toc.length >= minHeadings;
}

/**
 * Filter TOC items by level range
 */
export function filterTocByLevel(
  items: TocItem[],
  minLevel: number = 1,
  maxLevel: number = 3,
): TocItem[] {
  return items.filter((item) => item.level >= minLevel && item.level <= maxLevel);
}
