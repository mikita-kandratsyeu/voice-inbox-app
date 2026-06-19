import {
  estimateGraphSearchFocusBottomInset,
  GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE,
  GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT,
  GRAPH_STICKY_SEARCH_COMPACT_VERTICAL_PADDING,
  GRAPH_STICKY_SEARCH_CONTENT_GAP,
  GRAPH_STICKY_SEARCH_EXPANDED_VERTICAL_PADDING,
  GRAPH_STICKY_SEARCH_FLOAT_OUTER_TOP_PAD,
  GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT,
  shouldShowGraphSearchMatchLabel,
} from '../graphViewportInsets';
import { FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP } from '@/shared/ui/floatingSearchBarMetrics';

describe('shouldShowGraphSearchMatchLabel', () => {
  it('shows when there are matches', () => {
    expect(
      shouldShowGraphSearchMatchLabel({
        query: 'alpha',
        debouncedQuery: 'alpha',
        matchCount: 2,
        matchIndex: 0,
      }),
    ).toBe(true);
  });

  it('shows when debounced query has no matches', () => {
    expect(
      shouldShowGraphSearchMatchLabel({
        query: 'missing',
        debouncedQuery: 'missing',
        matchCount: 0,
        matchIndex: null,
      }),
    ).toBe(true);
  });

  it('hides while debounce is pending', () => {
    expect(
      shouldShowGraphSearchMatchLabel({
        query: 'alpha',
        debouncedQuery: '',
        matchCount: 0,
        matchIndex: null,
      }),
    ).toBe(false);
  });

  it('hides for an empty query', () => {
    expect(
      shouldShowGraphSearchMatchLabel({
        query: '',
        debouncedQuery: '',
        matchCount: 0,
        matchIndex: null,
      }),
    ).toBe(false);
  });
});

describe('estimateGraphSearchFocusBottomInset', () => {
  it('returns floating controls clearance when search is hidden', () => {
    expect(
      estimateGraphSearchFocusBottomInset({ searchBarVisible: false, safeAreaBottom: 34 }),
    ).toBe(GRAPH_FLOATING_CONTROLS_BOTTOM_CLEARANCE);
  });

  it('uses compact chrome height when the status line is hidden', () => {
    const inset = estimateGraphSearchFocusBottomInset({
      searchBarVisible: true,
      safeAreaBottom: 20,
      showMatchLabel: false,
    });

    expect(inset).toBe(
      GRAPH_STICKY_SEARCH_FLOAT_OUTER_TOP_PAD +
        GRAPH_STICKY_SEARCH_COMPACT_VERTICAL_PADDING +
        GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT +
        FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP,
    );
  });

  it('includes the status line block when it is visible', () => {
    const inset = estimateGraphSearchFocusBottomInset({
      searchBarVisible: true,
      safeAreaBottom: 20,
      showMatchLabel: true,
    });

    expect(inset).toBe(
      GRAPH_STICKY_SEARCH_FLOAT_OUTER_TOP_PAD +
        GRAPH_STICKY_SEARCH_EXPANDED_VERTICAL_PADDING +
        GRAPH_STICKY_SEARCH_BAR_ROW_HEIGHT +
        GRAPH_STICKY_SEARCH_CONTENT_GAP +
        GRAPH_STICKY_SEARCH_MATCH_LABEL_HEIGHT +
        FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP,
    );
  });
});
