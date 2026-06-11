const TEMPLATE_ROW_HEIGHT = 68;
const TITLE_BLOCK_HEIGHT = 72;
const FOOTER_HEIGHT = 56;
const SHEET_PADDING = 40;

export function getAiOrganizeTemplateSheetSnapHeight(
  bottomInset: number,
  templateCount: number,
): number {
  return (
    TITLE_BLOCK_HEIGHT +
    templateCount * TEMPLATE_ROW_HEIGHT +
    FOOTER_HEIGHT +
    SHEET_PADDING +
    bottomInset
  );
}

export function getAiOrganizeSheetBottomPadding(bottomInset: number): number {
  return Math.max(12, bottomInset);
}
