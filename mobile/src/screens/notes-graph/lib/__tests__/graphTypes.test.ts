import { recordNodeId, taskNodeId } from '../graphTypes';

describe('graphTypes node ids', () => {
  it('builds stable record node ids', () => {
    expect(recordNodeId('abc-123')).toBe('record:abc-123');
  });

  it('builds stable task node ids', () => {
    expect(taskNodeId('rec-1', 'task-9')).toBe('task:rec-1:task-9');
  });
});
