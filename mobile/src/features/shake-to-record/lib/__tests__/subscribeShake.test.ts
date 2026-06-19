import {
  advanceShakeConfirm,
  computeShakeDelta,
  createShakeConfirmState,
  isShakeImpulse,
} from '../shakeDetection';

describe('shakeDetection', () => {
  it('detects a sharp acceleration impulse (Android-scale sample)', () => {
    expect(isShakeImpulse(5, 5, 5, 0, 0, 0, 100)).toBe(true);
  });

  it('detects a lighter iOS-scale impulse via per-axis delta', () => {
    expect(computeShakeDelta(0.7, -0.8, 1.6, 0, 0, 1)).toBeGreaterThan(1.75);
    expect(isShakeImpulse(0.7, -0.8, 1.6, 0, 0, 1, 100)).toBe(true);
  });

  it('ignores slow drift', () => {
    expect(isShakeImpulse(0.11, 0.1, 9.81, 0.1, 0.1, 9.8, 100)).toBe(false);
  });

  it('confirms shake after two impulses in a short window', () => {
    const first = advanceShakeConfirm(createShakeConfirmState(), true, 1000);
    expect(first.confirmed).toBe(false);

    const second = advanceShakeConfirm(first.next, true, 1150);
    expect(second.confirmed).toBe(true);
  });
});
