import {
  getGraphLayoutModeSheetBottomPadding,
  getGraphLayoutModeSheetSnapHeight,
  GRAPH_LAYOUT_MODE_SHEET_BODY_HEIGHT,
  GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA,
  GRAPH_LAYOUT_MODE_SHEET_MIN_BOTTOM_PADDING,
} from '../graphLayoutModeSheetLayout';

describe('graphLayoutModeSheetLayout', () => {
  it('adds safe-area and extra bottom padding to the static body height', () => {
    expect(getGraphLayoutModeSheetBottomPadding(34)).toBe(
      34 + GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA,
    );
    expect(getGraphLayoutModeSheetBottomPadding(0)).toBe(
      GRAPH_LAYOUT_MODE_SHEET_MIN_BOTTOM_PADDING + GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA,
    );
    expect(getGraphLayoutModeSheetSnapHeight(34)).toBe(
      GRAPH_LAYOUT_MODE_SHEET_BODY_HEIGHT + 34 + GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA,
    );
  });
});
