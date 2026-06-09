import type { Colors } from '@/shared/config';

import {
  getGraphEdgeGlowStyle,
  getGraphEdgeStrokeStyle,
  getLegendEdgeStrokeStyle,
  resolveGraphEdgeEmphasis,
} from '../graphEdgeStyles';
import type { GraphEdge, GraphEdgeKind } from '../graphTypes';

const edge: GraphEdge = {
  id: 'similar:a|b',
  kind: 'similar',
  sourceId: 'record:a',
  targetId: 'record:b',
};

const color = {
  accent: { primary: '#3b82f6' },
  text: { primary: '#e5e5e5', secondary: '#6b6b6b', muted: '#6b7280' },
  border: { default: '#2e2e2e' },
} as Colors;

describe('resolveGraphEdgeEmphasis', () => {
  it('highlights edges connected to the active node', () => {
    expect(resolveGraphEdgeEmphasis(edge, null, 'record:a')).toBe('highlighted');
  });

  it('highlights edges between matched search nodes', () => {
    expect(resolveGraphEdgeEmphasis(edge, new Set(['record:a', 'record:b']), null)).toBe(
      'highlighted',
    );
  });

  it('dims edges outside the active search result', () => {
    expect(resolveGraphEdgeEmphasis(edge, new Set(['record:c']), null)).toBe('dimmed');
  });

  it('returns default emphasis when search is inactive', () => {
    expect(resolveGraphEdgeEmphasis(edge, null, null)).toBe('default');
    expect(resolveGraphEdgeEmphasis(edge, new Set(), null)).toBe('default');
  });
});

describe('getLegendEdgeStrokeStyle', () => {
  it.each<GraphEdgeKind>(['similar', 'sharedTag', 'sameFolder', 'contains'])(
    'returns legend stroke for %s edges',
    (kind) => {
      const style = getLegendEdgeStrokeStyle(kind, color);

      expect(style.stroke).toBeTruthy();
      expect(style.strokeWidth).toBeGreaterThan(0);
      expect(style.opacity).toBeGreaterThan(0);
    },
  );
});

describe('getGraphEdgeStrokeStyle', () => {
  it('dims highlighted base styles', () => {
    const dimmed = getGraphEdgeStrokeStyle('sharedTag', color, 'dimmed');
    const base = getGraphEdgeStrokeStyle('sharedTag', color, 'default');

    expect(dimmed.opacity).toBeLessThan(base.opacity);
  });

  it('boosts similar edges when highlighted', () => {
    const highlighted = getGraphEdgeStrokeStyle('similar', color, 'highlighted');
    const base = getGraphEdgeStrokeStyle('similar', color, 'default');

    expect(highlighted.strokeWidth).toBeGreaterThan(base.strokeWidth);
    expect(highlighted.opacity).toBeGreaterThan(base.opacity);
  });
});

describe('getGraphEdgeGlowStyle', () => {
  it('returns glow only for similar edges', () => {
    expect(getGraphEdgeGlowStyle('similar', color)?.stroke).toBe(color.accent.primary);
    expect(getGraphEdgeGlowStyle('sharedTag', color)).toBeNull();
  });
});
