/** UI-thread 3D projection. Literals only — worklets cannot read module constants. */

export function clampGraph3DPitchWorklet(pitch: number): number {
  'worklet';

  return Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
}

export function graph3DDepthFadeWorklet(depth: number, depthMin: number, depthMax: number): number {
  'worklet';

  const span = Math.max(depthMax - depthMin, 0.001);
  const normalized = (depthMax - depth) / span;
  return 0.22 + Math.max(0, Math.min(1, normalized)) * 0.78;
}

export function graph3DNodeBaseRadiusWorklet(isTask: boolean, projectedScale: number): number {
  'worklet';

  const base = isTask ? 4.8 : 6.8;
  return base * Math.min(1.85, Math.max(0.65, projectedScale * 0.42));
}

export function clampGraph3DDistanceWorklet(distance: number): number {
  'worklet';

  const minDistance = 0.35;
  const maxDistance = 10;
  return Math.max(minDistance, Math.min(maxDistance, distance));
}

export function rotatePoint3DWorklet(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
): { x: number; y: number; z: number } {
  'worklet';

  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const rotatedX = x * cosYaw - z * sinYaw;
  const rotatedZFromYaw = x * sinYaw + z * cosYaw;

  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const rotatedY = y * cosPitch - rotatedZFromYaw * sinPitch;
  const rotatedZ = y * sinPitch + rotatedZFromYaw * cosPitch;

  return {
    x: rotatedX,
    y: rotatedY,
    z: rotatedZ,
  };
}

export function projectPoint3DWorklet(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  distance: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; z: number; scale: number } {
  'worklet';

  const perspective = 2.5;
  const rotated = rotatePoint3DWorklet(x, y, z, yaw, pitch);
  const depth = rotated.z + distance;
  const safeDepth = Math.max(depth, 0.15);
  const scale = perspective / safeDepth;
  const viewportScale = Math.min(viewportWidth, viewportHeight) * 0.35;

  return {
    x: viewportWidth / 2 + rotated.x * scale * viewportScale,
    y: viewportHeight / 2 - rotated.y * scale * viewportScale,
    z: depth,
    scale,
  };
}
