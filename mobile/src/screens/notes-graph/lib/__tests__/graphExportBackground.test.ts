import { colors } from '@/shared/config/colors';

import {
  GRAPH_EXPORT_BACKGROUND_IDS,
  GRAPH_EXPORT_DEFAULT_BACKGROUND_ID,
  graphExportBackgroundLabelKey,
  isGraphExportBackgroundId,
  resolveGraphExportBackground,
} from '../graphExportBackground';

describe('graphExportBackground', () => {
  it('recognizes valid background ids', () => {
    expect(isGraphExportBackgroundId('white')).toBe(true);
    expect(isGraphExportBackgroundId('rose')).toBe(true);
    expect(isGraphExportBackgroundId('canvas')).toBe(false);
    expect(isGraphExportBackgroundId('unknown')).toBe(false);
  });

  it('defaults to white', () => {
    expect(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID).toBe('white');
    expect(GRAPH_EXPORT_BACKGROUND_IDS).toContain('white');
  });

  it('maps ids to i18n label keys', () => {
    expect(graphExportBackgroundLabelKey('light')).toBe('backgroundLight');
    expect(graphExportBackgroundLabelKey('mint')).toBe('backgroundMint');
  });

  it('resolves accent tint presets without dots', () => {
    const style = resolveGraphExportBackground('blue', colors.light);

    expect(style.backgroundColor).toBe('#dbeafe');
    expect(style.showDots).toBe(false);
  });

  it('resolves dotted light preset', () => {
    const style = resolveGraphExportBackground('light', colors.light);

    expect(style.backgroundColor).toBe('#f9fafb');
    expect(style.showDots).toBe(true);
  });
});
