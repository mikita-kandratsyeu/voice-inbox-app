import { type SkColor, Skia } from '@shopify/react-native-skia';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';

import { buildGraph3DLayout } from './buildGraph3DLayout';
import { getGraphEdgeStrokeStyle } from './graphEdgeStyles';
import type { GraphEdge, GraphNode } from './graphTypes';
import { resolveGraph3DNodeColor } from './resolveGraph3DNodeColor';

export type Graph3DSceneEdge = {
  sourceIndex: number;
  targetIndex: number;
  color: SkColor;
  strokeWidth: number;
  opacity: number;
};

export type Graph3DSceneLayout = {
  nodePoints: number[];
  nodeColors: SkColor[];
  nodeKinds: number[];
  nodeCount: number;
  edges: Graph3DSceneEdge[];
  edgeOrder: number[];
  projectedX: number[];
  projectedY: number[];
  projectedZ: number[];
  projectedRadius: number[];
  nodeOrder: number[];
};

function colorStringToSkiaColor(value: string): SkColor {
  return Skia.Color(value);
}

export function prepareGraph3DSceneLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  color: Colors,
  foldersById: Map<string, Folder>,
  isProActive: boolean,
): Graph3DSceneLayout | null {
  if (nodes.length === 0) {
    return null;
  }

  const nodeIndexById = new Map<string, number>();
  const { nodePoints, nodeKinds } = buildGraph3DLayout(nodes, edges);
  const nodeColors: SkColor[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    nodeIndexById.set(node.id, index);
    nodeColors.push(
      colorStringToSkiaColor(resolveGraph3DNodeColor(node, color, foldersById, isProActive)),
    );
  }

  const sceneEdges: Graph3DSceneEdge[] = [];

  for (const edge of edges) {
    const sourceIndex = nodeIndexById.get(edge.sourceId);
    const targetIndex = nodeIndexById.get(edge.targetId);

    if (sourceIndex == null || targetIndex == null) {
      continue;
    }

    const style = getGraphEdgeStrokeStyle(edge.kind, color);

    sceneEdges.push({
      sourceIndex,
      targetIndex,
      color: colorStringToSkiaColor(style.stroke),
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? 1,
    });
  }

  return {
    nodePoints,
    nodeColors,
    nodeKinds,
    nodeCount: nodes.length,
    edges: sceneEdges,
    edgeOrder: sceneEdges.map((_, index) => index),
    projectedX: new Array(nodes.length).fill(0),
    projectedY: new Array(nodes.length).fill(0),
    projectedZ: new Array(nodes.length).fill(0),
    projectedRadius: new Array(nodes.length).fill(0),
    nodeOrder: new Array(nodes.length).fill(0),
  };
}
