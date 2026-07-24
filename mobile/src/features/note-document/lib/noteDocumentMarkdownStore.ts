const CACHE_MAX = 10;
const cache = new Map<string, string>();

export function getCachedNoteDocumentMarkdown(key: string): string | undefined {
  const value = cache.get(key);
  if (value === undefined) return undefined;

  cache.delete(key);
  cache.set(key, value);
  return value;
}

export function setCachedNoteDocumentMarkdown(key: string, markdown: string): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, markdown);

  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function hasCachedNoteDocumentMarkdown(key: string): boolean {
  return cache.has(key);
}

export function invalidateNoteDocumentCacheForRecord(recordId: string): void {
  const prefix = `${recordId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearNoteDocumentMarkdownCacheForTests(): void {
  cache.clear();
}
