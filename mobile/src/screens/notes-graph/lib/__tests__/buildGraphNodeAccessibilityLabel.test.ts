import type { VoiceRecord } from '@/entities/record';

import {
  buildGraphNodeDotAccessibilityLabel,
  buildGraphRecordNodeAccessibilityLabel,
  buildGraphTaskNodeAccessibilityLabel,
} from '../buildGraphNodeAccessibilityLabel';
import type { GraphNode } from '../graphTypes';
import { recordNodeId, taskNodeId } from '../graphTypes';

const t = ((key: string, options?: Record<string, unknown>) => {
  if (options) {
    return `${key}:${JSON.stringify(options)}`;
  }
  return key;
}) as never;

function makeRecord(id: string): VoiceRecord {
  return {
    id,
    title: `Note ${id}`,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    folderId: 'folder-1',
    tasks: [{ id: 'task-1', text: 'Follow up', isDone: false }],
  };
}

describe('buildGraphNodeAccessibilityLabel', () => {
  it('builds record card labels with folder and open tasks', () => {
    const node: GraphNode = {
      id: recordNodeId('a'),
      kind: 'record',
      x: 0,
      y: 0,
      searchText: 'note a',
      record: makeRecord('a'),
    };

    expect(buildGraphRecordNodeAccessibilityLabel(node, t, 'Work')).toContain(
      'notesGraph.node.a11yRecord',
    );
    expect(buildGraphRecordNodeAccessibilityLabel(node, t, 'Work')).toContain('Work');
  });

  it('builds task card labels with done state', () => {
    const node: GraphNode = {
      id: taskNodeId('a', 'task-1'),
      kind: 'task',
      x: 0,
      y: 0,
      searchText: 'follow up',
      parentRecordId: 'a',
      task: { id: 'task-1', text: 'Follow up', isDone: true },
    };

    expect(buildGraphTaskNodeAccessibilityLabel(node, t)).toContain('notesGraph.node.a11yTask');
    expect(buildGraphTaskNodeAccessibilityLabel(node, t)).toContain('allTasks.sections.done');
  });

  it('builds dot labels for record and task nodes', () => {
    const recordNode: GraphNode = {
      id: recordNodeId('a'),
      kind: 'record',
      x: 0,
      y: 0,
      searchText: 'note a',
      record: makeRecord('a'),
    };
    const taskNode: GraphNode = {
      id: taskNodeId('a', 'task-1'),
      kind: 'task',
      x: 0,
      y: 0,
      searchText: 'follow up',
      parentRecordId: 'a',
      task: { id: 'task-1', text: 'Follow up', isDone: false },
    };

    expect(buildGraphNodeDotAccessibilityLabel(recordNode, t)).toContain(
      'notesGraph.node.a11yDotRecord',
    );
    expect(buildGraphNodeDotAccessibilityLabel(taskNode, t)).toContain(
      'notesGraph.node.a11yDotTask',
    );
  });
});
