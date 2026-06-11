export function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesSearchQuery(value: string, query: string): boolean {
  if (!query) return true;
  return value.toLowerCase().includes(query);
}
