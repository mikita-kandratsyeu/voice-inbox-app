export type GraphNodePosition = { x: number; y: number };

const sessionPositions = new Map<string, GraphNodePosition>();

export function getSessionNodePositions(): Map<string, GraphNodePosition> {
  return new Map(sessionPositions);
}

export function setSessionNodePosition(id: string, x: number, y: number): void {
  sessionPositions.set(id, { x, y });
}

export function replaceSessionNodePositions(positions: Record<string, GraphNodePosition>): void {
  sessionPositions.clear();
  for (const [id, pos] of Object.entries(positions)) {
    sessionPositions.set(id, { x: pos.x, y: pos.y });
  }
}

export function clearGraphSessionLayout(): void {
  sessionPositions.clear();
}

export function clearStaleSessionPositions(validIds: ReadonlySet<string>): void {
  for (const id of sessionPositions.keys()) {
    if (!validIds.has(id)) {
      sessionPositions.delete(id);
    }
  }
}
