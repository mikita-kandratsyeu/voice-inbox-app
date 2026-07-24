import type { VoiceRecord } from '@/entities/record';

import { buildGraph3DLayout } from './buildGraph3DLayout';
import type {
  Graph3DLayoutWorkerRequest,
  Graph3DLayoutWorkerResponse,
} from './graph3DLayoutWorkerTypes';
import type { GraphEdge, GraphNode } from './graphTypes';

function toGraphNode(stub: Graph3DLayoutWorkerRequest['nodes'][number]): GraphNode {
  const recordId = stub.kind === 'record' ? stub.id.replace(/^record:/, '') : '';

  return {
    id: stub.id,
    kind: stub.kind,
    x: stub.x,
    y: stub.y,
    searchText: '',
    parentRecordId: stub.parentRecordId,
    record:
      stub.kind === 'record'
        ? ({
            id: recordId,
            folderId: stub.folderId ?? null,
            tags: stub.tags ?? [],
            title: '',
          } as VoiceRecord)
        : undefined,
  };
}

function toGraphEdges(edges: Graph3DLayoutWorkerRequest['edges']): GraphEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    kind: edge.kind,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
  }));
}

/** Pure 3D layout step — safe on main thread (Jest) and inside a worklet runtime. */
export function computeGraph3DLayoutWorkerResponse(
  request: Graph3DLayoutWorkerRequest,
): Graph3DLayoutWorkerResponse {
  const nodes = request.nodes.map(toGraphNode);
  const edges = toGraphEdges(request.edges);
  return buildGraph3DLayout(nodes, edges);
}

export function buildGraph3DLayoutWorkerRequest(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Graph3DLayoutWorkerRequest {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      x: node.x,
      y: node.y,
      parentRecordId: node.parentRecordId,
      folderId: node.record?.folderId ?? null,
      tags: node.record?.tags,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      kind: edge.kind,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })),
  };
}
