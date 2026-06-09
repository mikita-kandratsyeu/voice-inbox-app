const sessionPositions = new Map<string, { x: number; y: number }>();

export function getSessionNodePositions(): Map<string, { x: number; y: number }> {
  return new Map(sessionPositions);
}

export function setSessionNodePosition(id: string, x: number, y: number): void {
  sessionPositions.set(id, { x, y });
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
