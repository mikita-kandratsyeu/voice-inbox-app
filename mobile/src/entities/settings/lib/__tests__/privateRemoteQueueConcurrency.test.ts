import {
  clampPrivateRemoteQueueConcurrency,
  parseStoredPrivateRemoteQueueConcurrency,
} from '../privateRemoteQueueConcurrency';

describe('privateRemoteQueueConcurrency', () => {
  it('clamps values to 1..5', () => {
    expect(clampPrivateRemoteQueueConcurrency(0)).toBe(1);
    expect(clampPrivateRemoteQueueConcurrency(1)).toBe(1);
    expect(clampPrivateRemoteQueueConcurrency(3)).toBe(3);
    expect(clampPrivateRemoteQueueConcurrency(5)).toBe(5);
    expect(clampPrivateRemoteQueueConcurrency(9)).toBe(5);
  });

  it('parses stored values with fallback', () => {
    expect(parseStoredPrivateRemoteQueueConcurrency(undefined)).toBe(1);
    expect(parseStoredPrivateRemoteQueueConcurrency('bad')).toBe(1);
    expect(parseStoredPrivateRemoteQueueConcurrency('3')).toBe(3);
    expect(parseStoredPrivateRemoteQueueConcurrency('8')).toBe(5);
  });
});
