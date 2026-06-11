import { getAiOrganizeTemplateSheetSnapHeight } from '../aiOrganizeSheetLayout';

describe('aiOrganizeSheetLayout', () => {
  it('computes template sheet height from template count', () => {
    expect(getAiOrganizeTemplateSheetSnapHeight(0, 4)).toBe(72 + 4 * 68 + 56 + 40);
    expect(getAiOrganizeTemplateSheetSnapHeight(34, 4)).toBe(72 + 4 * 68 + 56 + 40 + 34);
  });
});
