import type { Colors } from '@/shared/config';

import { getLayoutModeIconAccent } from '../graphLayoutModeAccent';

const color = {
  accent: {
    primary: '#3b82f6',
    transcript: '#8b5cf6',
    cache: '#f59e0b',
    models: '#0891b2',
  },
} as Colors;

describe('graphLayoutModeAccent', () => {
  it('maps each layout mode to a distinct accent color', () => {
    const cluster = getLayoutModeIconAccent('cluster', color);
    const force = getLayoutModeIconAccent('force', color);
    const circular = getLayoutModeIconAccent('circular', color);

    expect(cluster).toBe(color.accent.models);
    expect(force).toBe(color.accent.transcript);
    expect(circular).toBe(color.accent.cache);
    expect(new Set([cluster, force, circular]).size).toBe(3);
  });

  it('stays distinct when user accent matches transcript violet', () => {
    const violetAccent = {
      accent: {
        primary: '#8b5cf6',
        transcript: '#8b5cf6',
        cache: '#f59e0b',
        models: '#0891b2',
      },
    } as Colors;
    const cluster = getLayoutModeIconAccent('cluster', violetAccent);
    const force = getLayoutModeIconAccent('force', violetAccent);

    expect(cluster).toBe('#0891b2');
    expect(force).toBe('#8b5cf6');
    expect(cluster).not.toBe(force);
  });
});
