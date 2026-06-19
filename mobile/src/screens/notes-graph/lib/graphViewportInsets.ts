import { FLOATING_SEARCH_BAR_BOTTOM_GAP } from '@/shared/ui/floatingSearchBarMetrics';

/** Minimum height of the search controls row inside the floating pill. */
export const GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT = 44;

/** Inner vertical padding when the match / status line is hidden (top + bottom). */
export const GRAPH_STICKY_SEARCH_COMPACT_VERTICAL_PADDING = 20;

/** Inner vertical padding when the match / status line is shown (top + bottom). */
export const GRAPH_STICKY_SEARCH_EXPANDED_VERTICAL_PADDING = 20;

/** Gap between the search row and the match label inside the pill. */
export const GRAPH_STICKY_SEARCH_CONTENT_GAP = 8;

/** Outer top inset for the floating search pill. */
export const GRAPH_STICKY_SEARCH_FLOAT_OUTER_TOP_PAD = 10;

/** Match counter line below the search row. */
export const GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT = 22;

/** Default clearance for floating zoom controls when search is hidden. */
export const GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE = 24;

export type GraphViewportInsets = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export function shouldShowGraphSearchMatchLabel(options: {
  query: string;
  debouncedQuery: string;
  matchCount: number;
  matchIndex: number | null;
}): boolean {
  const hasMatches = options.matchCount > 0 && options.matchIndex != null;
  if (hasMatches) {
    return true;
  }
  if (options.query !== options.debouncedQuery) {
    return false;
  }
  return options.debouncedQuery.trim().length > 0;
}

export function estimateGraphSearchFocusBottomInset(options: {
  searchBarVisible: boolean;
  safeAreaBottom: number;
  showMatchLabel?: boolean;
}): number {
  if (!options.searchBarVisible) {
    return GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE;
  }

  const innerVerticalPadding = options.showMatchLabel
    ? GRAPH_STICKY_SEARCH_EXPANDED_VERTICAL_PADDING
    : GRAPH_STICKY_SEARCH_COMPACT_VERTICAL_PADDING;
  const labelBlock = options.showMatchLabel
    ? GRAPH_STICKY_SEARCH_CONTENT_GAP + GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT
    : 0;

  const height =
    GRAPH_STICKY_SEARCH_FLOAT_OUTER_TOP_PAD +
    innerVerticalPadding +
    GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT +
    labelBlock;

  return height + Math.max(options.safeAreaBottom, 8) + FLOATING_SEARCH_BAR_BOTTOM_GAP;
}
