import {
  DEFAULT_GRAPH_LAYOUT_MODE,
  GRAPH_LAYOUT_MODES,
  isGraphLayoutMode,
  recordNodeId,
  taskNodeId,
} from '../graphTypes';

describe('graph layout modes', () => {
  it('defaults to force layout', () => {
    expect(DEFAULT_GRAPH_LAYOUT_MODE).toBe('force');
  });

  it('exposes all supported layout modes', () => {
    expect(GRAPH_LAYOUT_MODES).toEqual(['force', 'cluster', 'circular']);
  });

  it('validates layout mode tokens', () => {
    expect(isGraphLayoutMode('cluster')).toBe(true);
    expect(isGraphLayoutMode('force')).toBe(true);
    expect(isGraphLayoutMode('circular')).toBe(true);
    expect(isGraphLayoutMode('grid')).toBe(false);
    expect(isGraphLayoutMode('')).toBe(false);
  });
});

describe('graphTypes node ids', () => {
  it('builds stable record node ids', () => {
    expect(recordNodeId('abc-123')).toBe('record:abc-123');
  });

  it('builds stable task node ids', () => {
    expect(taskNodeId('rec-1', 'task-9')).toBe('task:rec-1:task-9');
  });
});
