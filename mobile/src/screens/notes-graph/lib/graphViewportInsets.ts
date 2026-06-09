/** Bottom chrome row (input + nav buttons) in GraphStickySearchBar. */
export const GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT = 48;

/** paddingTop + paddingBottom on FrostedBottomChrome content. */
export const GRAPH_STICKY_SEARCH_BAR_VERTICAL_PADDING = 28;

/** Match counter line + content gap below the search row. */
export const GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT = 22;

/** Default clearance for floating zoom controls when search is hidden. */
export const GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE = 24;

export type GraphViewportInsets = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export function estimateGraphSearchFocusBottomInset(options: {
  searchBarVisible: boolean;
  safeAreaBottom: number;
}): number {
  if (!options.searchBarVisible) {
    return GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE;
  }

  const height =
    GRAPH_STICKY_SEARCH_BAR_VERTICAL_PADDING +
    GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT +
    GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT;

  return height + options.safeAreaBottom + 8;
}
