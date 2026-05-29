const inFlightRecordIds = new Set<string>();

export function markCloudSummarizeInFlight(recordId: string): void {
  inFlightRecordIds.add(recordId);
}

export function clearCloudSummarizeInFlight(recordId: string): void {
  inFlightRecordIds.delete(recordId);
}

export function isCloudSummarizeInFlight(recordId: string): boolean {
  return inFlightRecordIds.has(recordId);
}
