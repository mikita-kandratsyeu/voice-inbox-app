import { formatElapsedLabelWorklet } from '../formatElapsedLabelWorklet';

describe('formatElapsedLabelWorklet', () => {
  it('formats mm:ss labels', () => {
    expect(formatElapsedLabelWorklet(0)).toBe('0:00');
    expect(formatElapsedLabelWorklet(65000)).toBe('1:05');
    expect(formatElapsedLabelWorklet(470000)).toBe('7:50');
  });
});
