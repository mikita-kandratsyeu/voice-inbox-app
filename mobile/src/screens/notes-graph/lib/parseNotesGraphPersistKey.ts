import type { GraphEdgeVisibility, GraphFilters, GraphLayoutMode } from './graphTypes';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  isGraphLayoutMode,
} from './graphTypes';

const PERSIST_KEY_TAIL_PARTS = 7;
const LEGACY_PERSIST_KEY_TAIL_PARTS = 6;

export type ParsedNotesGraphPersistKey = {
  recordsRevision: string;
  folderId: string | null;
  tags: string[];
  showTasks: boolean;
  edgeVisibility: GraphEdgeVisibility;
  layoutMode: GraphLayoutMode;
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

function parseSimplifyToken(token: string): boolean | null | undefined {
  if (token === 'auto') return null;
  if (token === '1') return true;
  if (token === '0') return false;
  return undefined;
}

function parseLegacyPersistKey(parts: string[]): ParsedNotesGraphPersistKey | null {
  if (parts.length < LEGACY_PERSIST_KEY_TAIL_PARTS + 1) return null;

  const filteredCount = Number(parts[parts.length - 1]);
  if (!Number.isFinite(filteredCount)) return null;

  const simplifyOverride = parseSimplifyToken(parts[parts.length - 2]!);
  if (simplifyOverride === undefined) return null;

  const edgeKey = parts[parts.length - 3]!;
  const edgeVisibility = parseEdgeVisibility(edgeKey);
  if (!edgeVisibility) return null;

  const showTasks = parts[parts.length - 4] === '1';
  const tagKey = parts[parts.length - 5]!;
  const folderIdRaw = parts[parts.length - 6]!;
  const recordsRevision = parts.slice(0, parts.length - LEGACY_PERSIST_KEY_TAIL_PARTS).join(';');

  return {
    recordsRevision,
    folderId: folderIdRaw || null,
    tags: tagKey ? tagKey.split('|').filter(Boolean) : [],
    showTasks,
    edgeVisibility,
    layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
    simplifyOverride,
    filteredCount,
  };
}

export function parseNotesGraphPersistKey(layoutKey: string): ParsedNotesGraphPersistKey | null {
  const parts = layoutKey.split(';');
  if (parts.length < PERSIST_KEY_TAIL_PARTS + 1) {
    return parseLegacyPersistKey(parts);
  }

  const filteredCount = Number(parts[parts.length - 1]);
  if (!Number.isFinite(filteredCount)) return null;

  const simplifyOverride = parseSimplifyToken(parts[parts.length - 2]!);
  if (simplifyOverride === undefined) return null;

  const layoutModeToken = parts[parts.length - 3]!;
  if (!isGraphLayoutMode(layoutModeToken)) {
    return parseLegacyPersistKey(parts);
  }

  const edgeKey = parts[parts.length - 4]!;
  const edgeVisibility = parseEdgeVisibility(edgeKey);
  if (!edgeVisibility) return null;

  const showTasks = parts[parts.length - 5] === '1';
  const tagKey = parts[parts.length - 6]!;
  const folderIdRaw = parts[parts.length - 7]!;
  const recordsRevision = parts.slice(0, parts.length - PERSIST_KEY_TAIL_PARTS).join(';');

  return {
    recordsRevision,
    folderId: folderIdRaw || null,
    tags: tagKey ? tagKey.split('|').filter(Boolean) : [],
    showTasks,
    edgeVisibility,
    layoutMode: layoutModeToken,
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
    layoutMode: parsed.layoutMode,
  };
}
