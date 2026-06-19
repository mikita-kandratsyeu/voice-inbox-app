import { IS_IOS } from '@/shared/lib/platform';

/**
 * react-native-sensors: iOS ≈ g, Android ≈ m/s².
 * Use both delta-sum and speed so shakes register on either platform.
 */
const SHAKE_SPEED_THRESHOLD = IS_IOS ? 280 : 950;
const SHAKE_DELTA_THRESHOLD = IS_IOS ? 1.75 : 9.5;

const SHAKE_CONFIRM_WINDOW_MS = 400;
const SHAKE_CONFIRM_SAMPLES = 2;

export function computeShakeSpeed(
  x: number,
  y: number,
  z: number,
  lastX: number,
  lastY: number,
  lastZ: number,
  elapsedMs: number,
): number {
  return (Math.abs(x + y + z - lastX - lastY - lastZ) / Math.max(elapsedMs, 1)) * 10000;
}

export function computeShakeDelta(
  x: number,
  y: number,
  z: number,
  lastX: number,
  lastY: number,
  lastZ: number,
): number {
  return Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
}

export function isShakeImpulse(
  x: number,
  y: number,
  z: number,
  lastX: number,
  lastY: number,
  lastZ: number,
  elapsedMs: number,
): boolean {
  const delta = computeShakeDelta(x, y, z, lastX, lastY, lastZ);
  if (delta > SHAKE_DELTA_THRESHOLD) {
    return true;
  }

  return computeShakeSpeed(x, y, z, lastX, lastY, lastZ, elapsedMs) > SHAKE_SPEED_THRESHOLD;
}

export type ShakeConfirmState = {
  impulseCount: number;
  windowStartedAt: number;
};

export function createShakeConfirmState(): ShakeConfirmState {
  return { impulseCount: 0, windowStartedAt: 0 };
}

/** Requires a couple of sharp impulses within a short window — fewer false triggers than one spike. */
export function advanceShakeConfirm(
  state: ShakeConfirmState,
  isImpulse: boolean,
  now: number,
): { confirmed: boolean; next: ShakeConfirmState } {
  if (!isImpulse) {
    return { confirmed: false, next: state };
  }

  const withinWindow =
    state.windowStartedAt > 0 && now - state.windowStartedAt <= SHAKE_CONFIRM_WINDOW_MS;
  const impulseCount = withinWindow ? state.impulseCount + 1 : 1;
  const windowStartedAt = withinWindow ? state.windowStartedAt : now;

  if (impulseCount >= SHAKE_CONFIRM_SAMPLES) {
    return {
      confirmed: true,
      next: createShakeConfirmState(),
    };
  }

  return {
    confirmed: false,
    next: { impulseCount, windowStartedAt },
  };
}

/** @deprecated Use isShakeImpulse + advanceShakeConfirm. */
export function isShakeSample(
  x: number,
  y: number,
  z: number,
  lastX: number,
  lastY: number,
  lastZ: number,
  elapsedMs: number,
): boolean {
  return isShakeImpulse(x, y, z, lastX, lastY, lastZ, elapsedMs);
}
