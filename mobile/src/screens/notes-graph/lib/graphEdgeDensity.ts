import type { GraphEdge, GraphNode } from './graphTypes';

const DENSITY_GRID_SIZE = 200;
const HIGH_DENSITY_THRESHOLD = 5;

export type EdgeDensityInfo = {
  totalEdges: number;
  maxDensity: number;
  isHighDensity: boolean;
  baseOpacity: number;
};

type GridCell = {
  edgeCount: number;
};

function getCellKey(x: number, y: number): string {
  const cellX = Math.floor(x / DENSITY_GRID_SIZE);
  const cellY = Math.floor(y / DENSITY_GRID_SIZE);
  return `${cellX},${cellY}`;
}

export function computeEdgeDensity(
  edges: GraphEdge[],
  nodeById: Map<string, GraphNode>,
): EdgeDensityInfo {
  if (edges.length === 0) {
    return {
      totalEdges: 0,
      maxDensity: 0,
      isHighDensity: false,
      baseOpacity: 1,
    };
  }

  const grid = new Map<string, GridCell>();

  for (const edge of edges) {
    const sourceNode = nodeById.get(edge.sourceId);
    const targetNode = nodeById.get(edge.targetId);

    if (!sourceNode || !targetNode) continue;

    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    const cellKey = getCellKey(midX, midY);

    const cell = grid.get(cellKey) ?? { edgeCount: 0 };
    cell.edgeCount++;
    grid.set(cellKey, cell);
  }

  let maxDensity = 0;
  for (const cell of grid.values()) {
    maxDensity = Math.max(maxDensity, cell.edgeCount);
  }

  const isHighDensity = maxDensity >= HIGH_DENSITY_THRESHOLD || edges.length > 100;
  const baseOpacity = isHighDensity ? Math.max(0.25, Math.min(0.6, 50 / edges.length)) : 1;

  return {
    totalEdges: edges.length,
    maxDensity,
    isHighDensity,
    baseOpacity,
  };
}

export function adjustEdgeCurvatureForDensity(
  baseCurvature: number,
  densityInfo: EdgeDensityInfo,
): number {
  if (!densityInfo.isHighDensity) return baseCurvature;

  const densityFactor = Math.min(1.8, 1 + densityInfo.maxDensity / 15);
  return baseCurvature * densityFactor;
}
