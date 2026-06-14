import {
  appendLinkedRecordId,
  normalizeLinkedRecordIds,
  removeLinkedRecordId,
} from '../normalizeLinkedRecordIds';

describe('normalizeLinkedRecordIds', () => {
  it('dedupes and trims ids', () => {
    expect(normalizeLinkedRecordIds([' a ', 'b', 'a', ''])).toEqual(['a', 'b']);
  });

  it('returns undefined for empty input', () => {
    expect(normalizeLinkedRecordIds([])).toBeUndefined();
    expect(normalizeLinkedRecordIds(null)).toBeUndefined();
  });
});

describe('appendLinkedRecordId', () => {
  it('rejects self-links and duplicates', () => {
    expect(appendLinkedRecordId(['b'], 'self', 'self')).toEqual(['b']);
    expect(appendLinkedRecordId(['b'], 'b', 'self')).toEqual(['b']);
  });

  it('appends a new link', () => {
    expect(appendLinkedRecordId(['b'], 'c', 'self')).toEqual(['b', 'c']);
  });
});

describe('removeLinkedRecordId', () => {
  it('removes a link and clears when empty', () => {
    expect(removeLinkedRecordId(['a', 'b'], 'a')).toEqual(['b']);
    expect(removeLinkedRecordId(['a'], 'a')).toBeUndefined();
  });
});
