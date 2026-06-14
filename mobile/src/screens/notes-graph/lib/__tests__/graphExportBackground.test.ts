import { colors } from '@/shared/config/colors';

import {
  GRAPH_EXPORT_CANVAS_BACKGROUND_ID,
  GRAPH_EXPORT_COLOR_BACKGROUND_IDS,
  graphExportBackgroundLabelKey,
  isGraphExportBackgroundId,
  resolveGraphExportBackground,
} from '../graphExportBackground';

describe('graphExportBackground', () => {
  it('recognizes valid background ids', () => {
    expect(isGraphExportBackgroundId('canvas')).toBe(true);
    expect(isGraphExportBackgroundId('white')).toBe(true);
    expect(isGraphExportBackgroundId('unknown')).toBe(false);
  });

  it('resolves canvas from the active theme colors', () => {
    const style = resolveGraphExportBackground('canvas', colors.light);

    expect(style).toEqual({
      id: 'canvas',
      backgroundColor: colors.light.background.secondary,
      showDots: true,
      dotColor: colors.light.text.muted,
    });
  });

  it('resolves transparent export without dots', () => {
    const style = resolveGraphExportBackground('transparent', colors.dark);

    expect(style.backgroundColor).toBe('transparent');
    expect(style.showDots).toBe(false);
  });

  it('keeps canvas separate from color preset ids', () => {
    expect(GRAPH_EXPORT_COLOR_BACKGROUND_IDS).not.toContain(GRAPH_EXPORT_CANVAS_BACKGROUND_ID);
    expect(GRAPH_EXPORT_COLOR_BACKGROUND_IDS).toContain('transparent');
    expect(GRAPH_EXPORT_COLOR_BACKGROUND_IDS).toContain('white');
  });

  it('maps ids to i18n label keys', () => {
    expect(graphExportBackgroundLabelKey('dark')).toBe('backgroundDark');
    expect(graphExportBackgroundLabelKey('light')).toBe('backgroundLight');
    expect(graphExportBackgroundLabelKey('mint')).toBe('backgroundMint');
  });

  it('resolves accent tint presets without dots', () => {
    const style = resolveGraphExportBackground('blue', colors.light);

    expect(style.backgroundColor).toBe('#dbeafe');
    expect(style.showDots).toBe(false);
  });
});
