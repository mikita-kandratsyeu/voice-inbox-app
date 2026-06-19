import { DEFAULT_ACCENT_COLOR_ID } from '@/shared/config/accentColors';
import { colors } from '@/shared/config/colors';

import { resolveGraphExportColors } from '../graphExportColors';

describe('graphExportColors', () => {
  it('uses light palette for all export backgrounds', () => {
    const exportColors = resolveGraphExportColors('white', colors.dark, DEFAULT_ACCENT_COLOR_ID);

    expect(exportColors.background.card).toBe(colors.light.background.card);
    expect(exportColors.text.primary).toBe(colors.light.text.primary);
    expect(exportColors.text.secondary).toBe('#64748b');
    expect(exportColors.shadow.opacity).toBeGreaterThan(colors.light.shadow.opacity);
  });

  it('uses the same palette across light export backgrounds', () => {
    const whiteColors = resolveGraphExportColors('white', colors.dark, DEFAULT_ACCENT_COLOR_ID);
    const roseColors = resolveGraphExportColors('rose', colors.dark, DEFAULT_ACCENT_COLOR_ID);

    expect(whiteColors).toEqual(roseColors);
  });
});
