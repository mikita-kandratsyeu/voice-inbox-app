import { centeredCosineSimilarity, computeCentroid, cosineSimilarity } from '../cosineSimilarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for empty or mismatched lengths', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });

  it('returns 0 when either vector has zero norm', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('computeCentroid', () => {
  it('averages embeddings dimension-wise', () => {
    expect(
      computeCentroid([
        [0, 0],
        [2, 4],
      ]),
    ).toEqual([1, 2]);
  });

  it('returns empty array for no embeddings', () => {
    expect(computeCentroid([])).toEqual([]);
  });
});

describe('centeredCosineSimilarity', () => {
  it('compares embeddings relative to centroid', () => {
    const centroid = computeCentroid([
      [1, 0],
      [0, 1],
    ]);
    const sim = centeredCosineSimilarity([1, 0], [0, 1], centroid);
    expect(sim).toBeCloseTo(-1);
  });
});
