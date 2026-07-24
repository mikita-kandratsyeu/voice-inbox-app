import { getGraphShowArchived } from './graphArchivePreferences';
import { getGraphNodeDisplayMode } from './graphNodeDisplayModePreferences';
import type { GraphFilters } from './graphTypes';
import { DEFAULT_GRAPH_LAYOUT_MODE } from './graphTypes';

export function buildLocalGraphFilters(): GraphFilters {
  return {
    folderIds: [],
    tags: [],
    showTasks: true,
    showCompletedTasks: true,
    showArchived: getGraphShowArchived(),
    edgeVisibility: {
      linked: true,
      similar: true,
      sharedTag: false,
      sameFolder: false,
      contains: true,
    },
    layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
    nodeDisplayMode: getGraphNodeDisplayMode(),
  };
}

export function resolveLocalGraphDepth(localDepth: 1 | 2 | undefined): 1 | 2 {
  return localDepth ?? 2;
}
