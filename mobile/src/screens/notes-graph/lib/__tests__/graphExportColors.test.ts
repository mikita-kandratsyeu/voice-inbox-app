import { DEFAULT_ACCENT_COLOR_ID } from '@/shared/config/accentColors';
import { colors } from '@/shared/config/colors';

import {
  getGraphExportNodeColorKey,
  resolveGraphExportColors,
  shouldRecaptureGraphExportForBackground,
} from '../graphExportColors';

describe('graphExportColors', () => {
  it('maps export backgrounds to node color keys', () => {
    expect(getGraphExportNodeColorKey('canvas')).toBe('app');
    expect(getGraphExportNodeColorKey('transparent')).toBe('app');
    expect(getGraphExportNodeColorKey('white')).toBe('light');
    expect(getGraphExportNodeColorKey('navy')).toBe('dark');
  });

  it('uses app colors for canvas exports', () => {
    const appColors = colors.dark;

    expect(resolveGraphExportColors('canvas', appColors, DEFAULT_ACCENT_COLOR_ID)).toBe(appColors);
  });

  it('uses light palette for pastel export backgrounds', () => {
    const exportColors = resolveGraphExportColors('blue', colors.dark, DEFAULT_ACCENT_COLOR_ID);

    expect(exportColors.background.card).toBe(colors.light.background.card);
    expect(exportColors.text.primary).toBe(colors.light.text.primary);
    expect(exportColors.shadow.opacity).toBeGreaterThan(colors.light.shadow.opacity);
  });

  it('uses dark palette for navy exports', () => {
    const exportColors = resolveGraphExportColors('navy', colors.light, DEFAULT_ACCENT_COLOR_ID);

    expect(exportColors.background.card).toBe(colors.dark.background.card);
    expect(exportColors.text.primary).toBe(colors.dark.text.primary);
  });

  it('detects when background changes require recapture', () => {
    expect(shouldRecaptureGraphExportForBackground('canvas', 'white')).toBe(true);
    expect(shouldRecaptureGraphExportForBackground('blue', 'rose')).toBe(false);
    expect(shouldRecaptureGraphExportForBackground('navy', 'black')).toBe(false);
    expect(shouldRecaptureGraphExportForBackground('white', 'navy')).toBe(true);
  });
});
