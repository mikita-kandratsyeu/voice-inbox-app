import type { GraphEdgeVisibility, GraphFilters } from './graphTypes';
import { DEFAULT_EDGE_VISIBILITY } from './graphTypes';

const PERSIST_KEY_TAIL_PARTS = 6;

export type ParsedNotesGraphPersistKey = {
  recordsRevision: string;
  folderId: string | null;
  tags: string[];
  showTasks: boolean;
  edgeVisibility: GraphEdgeVisibility;
  simplifyOverride: boolean | null;
  filteredCount: number;
};

function parseEdgeVisibility(edgeKey: string): GraphEdgeVisibility | null {
  const edgeVisibility: GraphEdgeVisibility = { ...DEFAULT_EDGE_VISIBILITY };

  if (!edgeKey) return null;

  for (const segment of edgeKey.split(',')) {
    if (!segment) continue;
    const colon = segment.indexOf(':');
    if (colon === -1) return null;
    const kind = segment.slice(0, colon);
    const value = segment.slice(colon + 1);
    if (!(kind in edgeVisibility)) return null;
    edgeVisibility[kind as keyof GraphEdgeVisibility] = value === '1';
  }

  return edgeVisibility;
}

export function parseNotesGraphPersistKey(layoutKey: string): ParsedNotesGraphPersistKey | null {
  const parts = layoutKey.split(';');
  if (parts.length < PERSIST_KEY_TAIL_PARTS + 1) return null;

  const filteredCount = Number(parts[parts.length - 1]);
  if (!Number.isFinite(filteredCount)) return null;

  const simplifyToken = parts[parts.length - 2];
  let simplifyOverride: boolean | null;
  if (simplifyToken === 'auto') {
    simplifyOverride = null;
  } else if (simplifyToken === '1') {
    simplifyOverride = true;
  } else if (simplifyToken === '0') {
    simplifyOverride = false;
  } else {
    return null;
  }

  const edgeKey = parts[parts.length - 3];
  const edgeVisibility = parseEdgeVisibility(edgeKey);
  if (!edgeVisibility) return null;

  const showTasks = parts[parts.length - 4] === '1';
  const tagKey = parts[parts.length - 5];
  const folderIdRaw = parts[parts.length - 6];
  const recordsRevision = parts.slice(0, parts.length - PERSIST_KEY_TAIL_PARTS).join(';');

  return {
    recordsRevision,
    folderId: folderIdRaw || null,
    tags: tagKey ? tagKey.split('|').filter(Boolean) : [],
    showTasks,
    edgeVisibility,
    simplifyOverride,
    filteredCount,
  };
}

export function parsedPersistKeyToGraphFilters(parsed: ParsedNotesGraphPersistKey): GraphFilters {
  return {
    folderId: parsed.folderId,
    tags: parsed.tags,
    showTasks: parsed.showTasks,
    edgeVisibility: { ...parsed.edgeVisibility },
  };
}
