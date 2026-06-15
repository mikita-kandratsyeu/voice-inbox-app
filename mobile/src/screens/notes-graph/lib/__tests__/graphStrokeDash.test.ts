import { parseStrokeDashIntervals } from '../graphStrokeDash';

describe('parseStrokeDashIntervals', () => {
  it('parses space-separated dash arrays', () => {
    expect(parseStrokeDashIntervals('8 4')).toEqual([8, 4]);
  });

  it('returns null for empty dash arrays', () => {
    expect(parseStrokeDashIntervals(undefined)).toBeNull();
    expect(parseStrokeDashIntervals('')).toBeNull();
  });
});
