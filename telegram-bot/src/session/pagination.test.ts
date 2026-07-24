import {
  freshPagination,
  getCursorForPage,
  hasNextPage,
  hasPrevPage,
  paginationKey,
  recordNextCursor,
} from './pagination.js';

describe('pagination', () => {
  it('starts with null cursor on page 0', () => {
    const page = freshPagination();
    expect(getCursorForPage(page, 0)).toBeNull();
  });

  it('records next cursor for following page', () => {
    let page = freshPagination();
    page = recordNextCursor(page, 0, 'ticket-abc');
    expect(getCursorForPage(page, 1)).toBe('ticket-abc');
    expect(hasNextPage(page, 0, 'ticket-abc')).toBe(true);
    expect(hasPrevPage(1)).toBe(true);
  });

  it('builds stable list keys', () => {
    expect(paginationKey(['support', 'open', ''])).toBe('support:open:');
  });
});
