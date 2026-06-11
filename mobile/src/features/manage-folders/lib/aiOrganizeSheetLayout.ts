import {
  getFixedSnapSheetBottomPadding,
  getFixedSnapSheetHeight,
} from '@/shared/lib/bottom-sheet/fixedSnapSheetLayout';

/** Gorhom handle indicator area above sheet content. */
export const AI_ORGANIZE_SHEET_HANDLE_HEIGHT = 16;

/** Centered title + subtitle block (`marginTop: 4` on title through subtitle `marginBottom: 10`). */
export const AI_ORGANIZE_SHEET_HEADER_HEIGHT = 60;

/** Icon row: `paddingVertical: 14` + 34px badge. */
export const AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT = 64;

/** Title + hint row — same per-row budget as `GraphLayoutModeSheet` (246 / 3). */
export const AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT = 72;

/** Single cancel row (`mt-3` + 44pt button). */
export const AI_ORGANIZE_SHEET_SINGLE_FOOTER_HEIGHT = 56;

/** Dual footer row (`mt-3` + 44pt buttons). */
export const AI_ORGANIZE_SHEET_DUAL_FOOTER_HEIGHT = 56;

/** Matches `useBottomSheetContentPadding(24)` on the batch email export sheet. */
export const AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING = 24;

export const AI_ORGANIZE_ACTION_SHEET_BODY_HEIGHT =
  AI_ORGANIZE_SHEET_HANDLE_HEIGHT +
  AI_ORGANIZE_SHEET_HEADER_HEIGHT +
  AI_ORGANIZE_SHEET_SINGLE_FOOTER_HEIGHT;

export const AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT =
  AI_ORGANIZE_SHEET_HANDLE_HEIGHT +
  AI_ORGANIZE_SHEET_HEADER_HEIGHT +
  AI_ORGANIZE_SHEET_DUAL_FOOTER_HEIGHT;

export function getAiOrganizeSheetBottomPadding(bottomInset: number): number {
  return getFixedSnapSheetBottomPadding({
    bottomInset,
    minBottomPadding: AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  });
}

export function getAiOrganizeTemplateSheetSnapHeight(
  bottomInset: number,
  templateCount: number,
): number {
  return getFixedSnapSheetHeight({
    bodyHeight: AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT,
    optionsHeight: templateCount * AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT,
    bottomInset,
    minBottomPadding: AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  });
}

export function getAiOrganizeActionSheetSnapHeight(
  bottomInset: number,
  actionCount: number,
): number {
  return getFixedSnapSheetHeight({
    bodyHeight: AI_ORGANIZE_ACTION_SHEET_BODY_HEIGHT,
    optionsHeight: actionCount * AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT,
    bottomInset,
    minBottomPadding: AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  });
}
