import { buildGraph3DLayout } from './buildGraph3DLayout';
import type { GraphEdge, GraphNode } from './graphTypes';

export type Point3D = {
  x: number;
  y: number;
  z: number;
};

export type Graph3DCamera = {
  yaw: number;
  pitch: number;
  distance: number;
};

export type ProjectedPoint = {
  x: number;
  y: number;
  z: number;
  scale: number;
};

export type Graph3DProjectedNode = {
  node: GraphNode;
  screenX: number;
  screenY: number;
  depth: number;
  radius: number;
};

export type Graph3DProjectedEdge = {
  edge: GraphEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
};

export const GRAPH_3D_PERSPECTIVE = 2.5;
export const GRAPH_3D_MIN_DISTANCE = 0.6;
export const GRAPH_3D_MAX_DISTANCE = 10;
export const GRAPH_3D_DEFAULT_YAW = 0.55;
export const GRAPH_3D_DEFAULT_PITCH = -0.42;
export const GRAPH_3D_DEFAULT_DISTANCE = 3;
export const GRAPH_3D_ORBIT_SENSITIVITY = 0.005;
export const GRAPH_3D_PINCH_ZOOM_SENSITIVITY = 0.85;

export const DEFAULT_GRAPH_3D_CAMERA: Graph3DCamera = {
  yaw: GRAPH_3D_DEFAULT_YAW,
  pitch: GRAPH_3D_DEFAULT_PITCH,
  distance: GRAPH_3D_DEFAULT_DISTANCE,
};

function hashStringToUnit(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return ((hash >>> 0) % 1000) / 1000;
}

export function computeGraphCenter(nodes: GraphNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  for (const node of nodes) {
    sumX += node.x;
    sumY += node.y;
  }

  return {
    x: sumX / nodes.length,
    y: sumY / nodes.length,
  };
}

export function computeGraph3DExtent(nodes: GraphNode[], center: { x: number; y: number }): number {
  if (nodes.length === 0) {
    return 1;
  }

  let maxDistance = 0;

  for (const node of nodes) {
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    maxDistance = Math.max(maxDistance, Math.hypot(dx, dy));
  }

  return Math.max(maxDistance, 1);
}

export function deriveGraphPoint3D(
  node: GraphNode,
  center: { x: number; y: number },
  extent: number,
): Point3D {
  const normalizedX = (node.x - center.x) / extent;
  const normalizedY = (node.y - center.y) / extent;
  const hash = hashStringToUnit(node.id);
  const kindLift = node.kind === 'task' ? 0.35 : 0;
  const z = (hash - 0.5) * 0.8 + kindLift;

  return {
    x: normalizedX,
    y: normalizedY,
    z,
  };
}

export function rotatePoint3D(point: Point3D, yaw: number, pitch: number): Point3D {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const rotatedX = point.x * cosYaw - point.z * sinYaw;
  const rotatedZFromYaw = point.x * sinYaw + point.z * cosYaw;

  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const rotatedY = point.y * cosPitch - rotatedZFromYaw * sinPitch;
  const rotatedZ = point.y * sinPitch + rotatedZFromYaw * cosPitch;

  return {
    x: rotatedX,
    y: rotatedY,
    z: rotatedZ,
  };
}

export function clampGraph3DPitch(pitch: number): number {
  return Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
}

export function clampGraph3DDistance(distance: number): number {
  return Math.max(GRAPH_3D_MIN_DISTANCE, Math.min(GRAPH_3D_MAX_DISTANCE, distance));
}

export function projectPoint3D(
  point: Point3D,
  camera: Graph3DCamera,
  viewport: { width: number; height: number },
): ProjectedPoint {
  const rotated = rotatePoint3D(point, camera.yaw, camera.pitch);
  const depth = rotated.z + camera.distance;
  const safeDepth = Math.max(depth, 0.15);
  const scale = GRAPH_3D_PERSPECTIVE / safeDepth;
  const viewportScale = Math.min(viewport.width, viewport.height) * 0.35;

  return {
    x: viewport.width / 2 + rotated.x * scale * viewportScale,
    y: viewport.height / 2 - rotated.y * scale * viewportScale,
    z: depth,
    scale,
  };
}

export function computeFitCameraDistance(
  nodes: GraphNode[],
  edges: GraphEdge[],
  viewport: { width: number; height: number },
): number {
  if (nodes.length === 0 || viewport.width <= 0 || viewport.height <= 0) {
    return GRAPH_3D_DEFAULT_DISTANCE;
  }

  const { nodePoints } = buildGraph3DLayout(nodes, edges);
  let maxSpan = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const pointOffset = index * 3;
    maxSpan = Math.max(
      maxSpan,
      Math.hypot(nodePoints[pointOffset], nodePoints[pointOffset + 1], nodePoints[pointOffset + 2]),
    );
  }

  const targetFraction = 0.36;
  const viewportScale = Math.min(viewport.width, viewport.height) * 0.35;
  const neededScale =
    (Math.min(viewport.width, viewport.height) * targetFraction) / Math.max(maxSpan, 0.5);
  const distance = (GRAPH_3D_PERSPECTIVE * viewportScale) / neededScale;

  return clampGraph3DDistance(distance);
}

export function buildProjectedGraph3D(
  nodes: GraphNode[],
  edges: GraphEdge[],
  camera: Graph3DCamera,
  viewport: { width: number; height: number },
): {
  projectedNodes: Graph3DProjectedNode[];
  projectedEdges: Graph3DProjectedEdge[];
} {
  if (nodes.length === 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { projectedNodes: [], projectedEdges: [] };
  }

  const center = computeGraphCenter(nodes);
  const extent = computeGraph3DExtent(nodes, center);
  const projectedByNodeId = new Map<string, ProjectedPoint>();

  for (const node of nodes) {
    const point3d = deriveGraphPoint3D(node, center, extent);
    projectedByNodeId.set(node.id, projectPoint3D(point3d, camera, viewport));
  }

  const projectedNodes = nodes
    .map((node) => {
      const projected = projectedByNodeId.get(node.id);
      if (!projected) {
        return null;
      }

      const radius = 6 * Math.min(1.8, Math.max(0.6, projected.scale * 0.4));

      return {
        node,
        screenX: projected.x,
        screenY: projected.y,
        depth: projected.z,
        radius,
      };
    })
    .filter((entry): entry is Graph3DProjectedNode => entry != null)
    .sort((left, right) => left.depth - right.depth);

  const projectedEdges = edges
    .map((edge) => {
      const from = projectedByNodeId.get(edge.sourceId);
      const to = projectedByNodeId.get(edge.targetId);

      if (!from || !to) {
        return null;
      }

      return {
        edge,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        depth: (from.z + to.z) / 2,
      };
    })
    .filter((entry): entry is Graph3DProjectedEdge => entry != null)
    .sort((left, right) => left.depth - right.depth);

  return { projectedNodes, projectedEdges };
}
