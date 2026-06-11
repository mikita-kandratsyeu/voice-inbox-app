import {
  AI_ORGANIZE_ACTION_SHEET_FOOTER_HEIGHT,
  AI_ORGANIZE_ACTION_SHEET_HEADER_HEIGHT,
  AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT,
  AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
  AI_ORGANIZE_SHEET_HANDLE_HEIGHT,
  AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT,
  AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT,
  getAiOrganizeActionSheetSnapHeight,
  getAiOrganizeSheetBottomPadding,
  getAiOrganizeTemplateSheetSnapHeight,
} from '../aiOrganizeSheetLayout';

describe('aiOrganizeSheetLayout', () => {
  it('adds safe-area and extra bottom padding like graph layout sheets', () => {
    expect(getAiOrganizeSheetBottomPadding(34)).toBe(34 + AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA);
    expect(getAiOrganizeSheetBottomPadding(0)).toBe(
      AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING + AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
    );
  });

  it('computes template sheet height from template count', () => {
    const bodyHeight =
      AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT + 4 * AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT;

    expect(getAiOrganizeTemplateSheetSnapHeight(0, 4)).toBe(
      bodyHeight +
        AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING +
        AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
    );
    expect(getAiOrganizeTemplateSheetSnapHeight(34, 4)).toBe(
      bodyHeight + 34 + AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
    );
  });

  it('computes action sheet height from action count and safe area', () => {
    const bodyHeight =
      AI_ORGANIZE_SHEET_HANDLE_HEIGHT +
      AI_ORGANIZE_ACTION_SHEET_HEADER_HEIGHT +
      4 * AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT +
      AI_ORGANIZE_ACTION_SHEET_FOOTER_HEIGHT;

    expect(getAiOrganizeActionSheetSnapHeight(0, 4)).toBe(
      bodyHeight +
        AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING +
        AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
    );
    expect(getAiOrganizeActionSheetSnapHeight(34, 4)).toBe(
      bodyHeight + 34 + AI_ORGANIZE_SHEET_BOTTOM_PADDING_EXTRA,
    );
  });
});
