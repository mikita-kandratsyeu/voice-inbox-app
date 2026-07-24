import { getFixedSnapSheetBottomPadding } from '@/shared/lib/bottom-sheet/fixedSnapSheetLayout';

/** Gorhom handle indicator area above sheet content. */
export const GRAPH_LAYOUT_MODE_SHEET_HANDLE_HEIGHT = 16;

/** Centered title + subtitle block. */
export const GRAPH_LAYOUT_MODE_SHEET_HEADER_HEIGHT = 52;

/** Three layout-mode rows with two-line hints. */
export const GRAPH_LAYOUT_MODE_SHEET_OPTIONS_HEIGHT = 246;

/** Cancel row (`mt-3` + 44pt button). */
export const GRAPH_LAYOUT_MODE_SHEET_FOOTER_HEIGHT = 52;

export const GRAPH_LAYOUT_MODE_SHEET_MIN_BOTTOM_PADDING = 20;

/** Extra breathing room above the home indicator, on top of the safe area. */
export const GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA = 8;

export const GRAPH_LAYOUT_MODE_SHEET_BODY_HEIGHT =
  GRAPH_LAYOUT_MODE_SHEET_HANDLE_HEIGHT +
  GRAPH_LAYOUT_MODE_SHEET_HEADER_HEIGHT +
  GRAPH_LAYOUT_MODE_SHEET_OPTIONS_HEIGHT +
  GRAPH_LAYOUT_MODE_SHEET_FOOTER_HEIGHT;

export function getGraphLayoutModeSheetBottomPadding(bottomInset: number): number {
  return getFixedSnapSheetBottomPadding({
    bottomInset,
    minBottomPadding: GRAPH_LAYOUT_MODE_SHEET_MIN_BOTTOM_PADDING,
    extraBottomPadding: GRAPH_LAYOUT_MODE_SHEET_BOTTOM_PADDING_EXTRA,
  });
}

export function getGraphLayoutModeSheetSnapHeight(bottomInset: number): number {
  return GRAPH_LAYOUT_MODE_SHEET_BODY_HEIGHT + getGraphLayoutModeSheetBottomPadding(bottomInset);
}
