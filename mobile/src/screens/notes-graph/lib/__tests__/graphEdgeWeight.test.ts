import { resolveLayoutEdgeWeight, similarEdgeLayoutWeight } from '../graphEdgeWeight';
import type { GraphEdge } from '../graphTypes';

describe('graphEdgeWeight', () => {
  it('uses shared base weights for all edge kinds', () => {
    expect(resolveLayoutEdgeWeight({ kind: 'sameFolder' })).toBe(2);
    expect(resolveLayoutEdgeWeight({ kind: 'sharedTag' })).toBe(1.4);
    expect(resolveLayoutEdgeWeight({ kind: 'linked' })).toBe(3.5);
  });

  it('scales similar edges by stored weight multiplier', () => {
    const edge: Pick<GraphEdge, 'kind' | 'weight'> = {
      kind: 'similar',
      weight: 1.2,
    };
    expect(resolveLayoutEdgeWeight(edge)).toBeCloseTo(3.6);
  });

  it('maps higher similarity scores to stronger layout weights', () => {
    const weak = similarEdgeLayoutWeight(0.1, 0.08);
    const strong = similarEdgeLayoutWeight(0.9, 0.08);
    expect(strong).toBeGreaterThan(weak);
  });
});
