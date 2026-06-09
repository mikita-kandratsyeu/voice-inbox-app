import {
  estimateGraphSearchFocusBottomInset,
  GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE,
  GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT,
  GRAPH_STICKY_SEARCH_BAR_VERTICAL_PADDING,
  GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT,
} from '../graphViewportInsets';

describe('estimateGraphSearchFocusBottomInset', () => {
  it('returns floating controls clearance when search is hidden', () => {
    expect(
      estimateGraphSearchFocusBottomInset({ searchBarVisible: false, safeAreaBottom: 34 }),
    ).toBe(GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE);
  });

  it('includes search chrome and safe area when search is visible', () => {
    const inset = estimateGraphSearchFocusBottomInset({
      searchBarVisible: true,
      safeAreaBottom: 20,
    });

    expect(inset).toBe(
      GRAPH_STICKY_SEARCH_BAR_VERTICAL_PADDING +
        GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT +
        GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT +
        20 +
        8,
    );
  });
});
