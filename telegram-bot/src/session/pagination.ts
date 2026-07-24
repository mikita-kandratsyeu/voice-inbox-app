/** Cursor-based list pagination stored per Telegram user session. */

export type CursorPage = {
  /** cursor used to fetch this page (null = first page) */
  cursors: (string | null)[];
};

export function paginationKey(parts: string[]): string {
  return parts.join(':');
}

export function getCursorForPage(page: CursorPage, pageIndex: number): string | null {
  if (pageIndex < 0) return null;
  return page.cursors[pageIndex] ?? null;
}

export function recordNextCursor(
  page: CursorPage,
  pageIndex: number,
  nextCursor: string | null,
): CursorPage {
  const cursors = [...page.cursors];
  while (cursors.length <= pageIndex) {
    cursors.push(null);
  }
  if (nextCursor) {
    cursors[pageIndex + 1] = nextCursor;
  } else if (cursors.length > pageIndex + 1) {
    cursors.length = pageIndex + 1;
  }
  return { cursors };
}

export function freshPagination(): CursorPage {
  return { cursors: [null] };
}

export function hasPrevPage(pageIndex: number): boolean {
  return pageIndex > 0;
}

export function hasNextPage(
  page: CursorPage,
  pageIndex: number,
  nextCursor: string | null,
): boolean {
  return Boolean(nextCursor) || Boolean(page.cursors[pageIndex + 1]);
}
