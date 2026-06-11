import {
  AI_ORGANIZE_ACTION_SHEET_BODY_HEIGHT,
  AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT,
  AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
  AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT,
  AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT,
  getAiOrganizeActionSheetSnapHeight,
  getAiOrganizeSheetBottomPadding,
  getAiOrganizeTemplateSheetSnapHeight,
} from '../aiOrganizeSheetLayout';

describe('aiOrganizeSheetLayout', () => {
  it('uses standard bottom padding matching other sheets', () => {
    expect(getAiOrganizeSheetBottomPadding(34)).toBe(34);
    expect(getAiOrganizeSheetBottomPadding(0)).toBe(AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING);
    expect(AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING).toBe(12);
  });

  it('computes template sheet height from template count', () => {
    const bodyHeight =
      AI_ORGANIZE_TEMPLATE_SHEET_BODY_HEIGHT + 4 * AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT;

    expect(getAiOrganizeTemplateSheetSnapHeight(0, 4)).toBe(
      bodyHeight + AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
    );
    expect(getAiOrganizeTemplateSheetSnapHeight(34, 4)).toBe(bodyHeight + 34);
  });

  it('computes action sheet height from action count and safe area', () => {
    const bodyHeight =
      AI_ORGANIZE_ACTION_SHEET_BODY_HEIGHT + 4 * AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT;

    expect(getAiOrganizeActionSheetSnapHeight(0, 4)).toBe(
      bodyHeight + AI_ORGANIZE_SHEET_MIN_BOTTOM_PADDING,
    );
    expect(getAiOrganizeActionSheetSnapHeight(34, 4)).toBe(bodyHeight + 34);
  });

  it('gives template rows more height than icon action rows', () => {
    expect(AI_ORGANIZE_TEMPLATE_SHEET_ROW_HEIGHT).toBeGreaterThan(
      AI_ORGANIZE_ACTION_SHEET_ROW_HEIGHT,
    );
    expect(getAiOrganizeTemplateSheetSnapHeight(0, 4)).toBeGreaterThan(
      getAiOrganizeActionSheetSnapHeight(0, 4),
    );
  });
});
