import { freshPagination, recordNextCursor } from './pagination.js';
import {
  clearSession,
  getPagination,
  isSupportAlertsEnabled,
  resetPagination,
  setPagination,
  setSupportAlertsEnabled,
} from './store.js';

describe('session store', () => {
  const user = '12345';

  afterEach(() => {
    clearSession(user);
  });

  it('tracks support alert preference', () => {
    expect(isSupportAlertsEnabled(user)).toBe(false);
    setSupportAlertsEnabled(user, true);
    expect(isSupportAlertsEnabled(user)).toBe(true);
  });

  it('stores pagination per list key', () => {
    resetPagination(user, 'audit');
    const page = recordNextCursor(freshPagination(), 0, 'cursor-1');
    setPagination(user, 'audit', page);
    expect(getPagination(user, 'audit').cursors[1]).toBe('cursor-1');
  });
});
