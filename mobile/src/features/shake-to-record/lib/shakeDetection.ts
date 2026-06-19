const SHAKE_SPEED_THRESHOLD = 900;
const SHAKE_FORCE_THRESHOLD = 1.65;

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

export function isShakeSample(
  x: number,
  y: number,
  z: number,
  lastX: number,
  lastY: number,
  lastZ: number,
  elapsedMs: number,
): boolean {
  const speed = computeShakeSpeed(x, y, z, lastX, lastY, lastZ, elapsedMs);
  if (speed <= SHAKE_SPEED_THRESHOLD) {
    return false;
  }

  const magnitude = Math.sqrt(x * x + y * y + z * z);
  const lastMagnitude = Math.sqrt(lastX * lastX + lastY * lastY + lastZ * lastZ);
  return Math.abs(magnitude - lastMagnitude) > SHAKE_FORCE_THRESHOLD;
}
