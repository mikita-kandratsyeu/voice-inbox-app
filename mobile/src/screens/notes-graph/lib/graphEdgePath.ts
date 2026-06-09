export function edgeBendSign(edgeId: string): number {
  let hash = 0;
  for (let i = 0; i < edgeId.length; i++) {
    hash = (hash + edgeId.charCodeAt(i)) % 2;
  }
  return hash === 0 ? 1 : -1;
}

export function computeQuadraticEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bendSign: number,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const curvature = Math.min(48, distance * 0.18) * bendSign;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const controlX = midX + normalX * curvature;
  const controlY = midY + normalY * curvature;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}
