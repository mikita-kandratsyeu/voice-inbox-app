import { isShakeSample } from '../shakeDetection';

describe('isShakeSample', () => {
  it('detects a sharp acceleration change as shake', () => {
    expect(isShakeSample(5, 5, 5, 0, 0, 0, 100)).toBe(true);
  });

  it('ignores slow drift from gravity', () => {
    expect(isShakeSample(0.11, 0.1, 9.81, 0.1, 0.1, 9.8, 100)).toBe(false);
  });
});
