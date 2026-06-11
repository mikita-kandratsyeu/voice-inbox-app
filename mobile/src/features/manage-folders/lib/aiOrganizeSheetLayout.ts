/** Gorhom handle indicator area above sheet content. */
export const AI_ORGANIZE_SHEET_HANDLE_HEIGHT = 16;

/** Centered title + subtitle block. */
export const AI_ORGANIZE_TEMPLATE_SHEET_HEADER_HEIGHT = 52;

/** Two-line template rows — same per-row budget as `GraphLayoutModeSheet`. */
export const AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT = 82;

/** Footer row (`mt-3` + 44pt button or dual actions). */
export const AI_ORGANIZE_TEMPLATE_SHEET_FOOTER_HEIGHT = 52;

/** Centered title + subtitle block (includes `paddingTop: 8`). */
export const AI_ORGANIZE_ACTION_SHEET_HEADER_HEIGHT = 60;

/** Icon row: `paddingVertical: 14` + 34px badge (single-line label). */
export const AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT = 62;

/** Cancel row (`mt-3` + 44pt button). */
export const AI_ORGANIZE_ACTION_SHEET_FOOTER_HEIGHT = 56;

export const AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING = 20;

/** Extra breathing room above the home indicator, on top of the safe area. */
export const AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA = 8;

export const AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT =
  AI_ORGANIZE_SHEET_HANDLE_HEIGHT +
  AI_ORGANIZE_TEMPLATE_SHEET_HEADER_HEIGHT +
  AI_ORGANIZE_TEMPLATE_SHEET_FOOTER_HEIGHT;

export function getAiOrganizeSheetBottomPadding(bottomInset: number): number {
  return (
    Math.max(bottomInset, AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING) +
    AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA
  );
}

export function getAiOrganizeTemplateSheetSnapHeight(
  bottomInset: number,
  templateCount: number,
): number {
  return (
    AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT +
    templateCount * AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT +
    getAiOrganizeSheetBottomPadding(bottomInset)
  );
}

export function getAiOrganizeActionSheetSnapHeight(
  bottomInset: number,
  actionCount: number,
): number {
  return (
    AI_ORGANIZE_SHEET_HANDLE_HEIGHT +
    AI_ORGANIZE_ACTION_SHEET_HEADER_HEIGHT +
    actionCount * AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT +
    AI_ORGANIZE_ACTION_SHEET_FOOTER_HEIGHT +
    getAiOrganizeSheetBottomPadding(bottomInset)
  );
}
