import type { GraphNode } from './graphTypes';

export function normalizeGraphSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export type GraphSearchIndexEntry = {
  id: string;
  searchText: string;
};

export function buildGraphSearchIndex(nodes: GraphNode[]): GraphSearchIndexEntry[] {
  return nodes.map((node) => ({
    id: node.id,
    searchText: node.searchText,
  }));
}

export function findGraphSearchMatchIds(
  index: readonly GraphSearchIndexEntry[],
  query: string,
): string[] {
  const normalized = normalizeGraphSearchQuery(query);
  if (!normalized) return [];

  const matches: string[] = [];
  for (const entry of index) {
    if (entry.searchText.includes(normalized)) {
      matches.push(entry.id);
    }
  }
  return matches;
}
