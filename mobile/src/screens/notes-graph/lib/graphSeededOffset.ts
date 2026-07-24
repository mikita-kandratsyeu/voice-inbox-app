/** Deterministic pseudo-random offset in [-0.5, 0.5] from a string seed. */
export function graphSeededUnitOffset(seed: string, salt = 0): number {
  let hash = salt;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 10_000) / 10_000 - 0.5;
}

export function graphSeededJitter(seed: string, amplitude: number): { x: number; y: number } {
  return {
    x: graphSeededUnitOffset(seed, 1) * amplitude,
    y: graphSeededUnitOffset(seed, 2) * amplitude,
  };
}
