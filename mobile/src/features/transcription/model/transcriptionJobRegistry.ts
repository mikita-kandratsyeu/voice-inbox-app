let nextJobGen = 1;
const activeJobGenByRecordId = new Map<string, number>();

export function beginTranscriptionJob(recordId: string): number {
  nextJobGen += 1;
  const gen = nextJobGen;
  activeJobGenByRecordId.set(recordId, gen);
  return gen;
}

export function isActiveTranscriptionJob(recordId: string, gen: number): boolean {
  return activeJobGenByRecordId.get(recordId) === gen;
}

export function endTranscriptionJobIfCurrent(recordId: string, gen: number): void {
  if (activeJobGenByRecordId.get(recordId) === gen) {
    activeJobGenByRecordId.delete(recordId);
  }
}

export function invalidateTranscriptionJob(recordId: string): void {
  activeJobGenByRecordId.delete(recordId);
}

export function hasActiveTranscriptionJob(recordId: string): boolean {
  return activeJobGenByRecordId.has(recordId);
}
