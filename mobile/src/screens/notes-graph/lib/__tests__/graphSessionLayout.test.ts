import {
  clearGraphSessionLayout,
  clearStaleSessionPositions,
  getSessionNodePositions,
  replaceSessionNodePositions,
  setSessionNodePosition,
} from '../graphSessionLayout';

describe('graphSessionLayout', () => {
  beforeEach(() => {
    clearGraphSessionLayout();
  });

  it('stores and returns node positions', () => {
    setSessionNodePosition('record:a', 10, 20);

    expect(getSessionNodePositions().get('record:a')).toEqual({ x: 10, y: 20 });
  });

  it('replaces all session positions', () => {
    setSessionNodePosition('record:a', 1, 2);
    replaceSessionNodePositions({
      'record:b': { x: 30, y: 40 },
    });

    const positions = getSessionNodePositions();
    expect(positions.get('record:a')).toBeUndefined();
    expect(positions.get('record:b')).toEqual({ x: 30, y: 40 });
  });

  it('removes stale ids that are no longer in the graph', () => {
    setSessionNodePosition('record:a', 1, 2);
    setSessionNodePosition('record:b', 3, 4);

    clearStaleSessionPositions(new Set(['record:a']));

    const positions = getSessionNodePositions();
    expect(positions.get('record:a')).toEqual({ x: 1, y: 2 });
    expect(positions.get('record:b')).toBeUndefined();
  });

  it('returns a copy so callers cannot mutate session state', () => {
    setSessionNodePosition('record:a', 1, 2);
    const snapshot = getSessionNodePositions();
    snapshot.set('record:a', { x: 99, y: 99 });

    expect(getSessionNodePositions().get('record:a')).toEqual({ x: 1, y: 2 });
  });
});
