import { colors } from '@/shared/config/colors';

import { getGraphExportControlTone } from '../graphExportControlTone';

describe('graphExportControlTone', () => {
  it('uses muted default styling at full opacity', () => {
    const tone = getGraphExportControlTone(colors.dark, { isActive: false });

    expect(tone.backgroundColor).toBe(colors.dark.background.tertiary);
    expect(tone.iconColor).toBe(colors.dark.text.muted);
    expect(tone.textColor).toBe(colors.dark.text.muted);
    expect(tone.chevronColor).toBe(colors.dark.text.muted);
    expect(tone.opacity).toBe(1);
  });

  it('uses accent styling when active', () => {
    const tone = getGraphExportControlTone(colors.dark, { isActive: true });

    expect(tone.backgroundColor).toBe(colors.dark.background.card);
    expect(tone.iconColor).toBe(colors.dark.accent.primary);
    expect(tone.textColor).toBe(colors.dark.text.primary);
    expect(tone.chevronColor).toBe(colors.dark.text.secondary);
  });

  it('dims only when disabled', () => {
    const tone = getGraphExportControlTone(colors.light, { isActive: false, disabled: true });

    expect(tone.opacity).toBe(0.45);
  });
});
