import { computeGraph3DExtent, computeGraphCenter } from './graph3dProjection';
import type { GraphEdge, GraphNode } from './graphTypes';

export type Graph3DLayoutPoint = {
  x: number;
  y: number;
  z: number;
};

export type Graph3DLayoutResult = {
  nodePoints: number[];
  nodeKinds: number[];
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type Graph3DLayoutTemplate = 'constellation' | 'clusterShells' | 'galaxyRings';

type Graph3DCluster = {
  id: string;
  nodeIndices: number[];
  recordCount: number;
};

type Graph3DRelaxOptions = {
  attractionStrength: number;
  centerPull: number;
  anchorStrength: number;
  iterations: number;
  repulsionStrength: number;
};

function hashStringToUnit(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return ((hash >>> 0) % 1000) / 1000;
}

function initialGraph3DPosition(
  node: GraphNode,
  index: number,
  center: { x: number; y: number },
  extent: number,
): Graph3DLayoutPoint {
  const normalizedX = (node.x - center.x) / extent;
  const normalizedY = (node.y - center.y) / extent;
  const radiusSquared = normalizedX * normalizedX + normalizedY * normalizedY;
  const paraboloidZ = Math.sqrt(Math.max(0, 1 - Math.min(0.92, radiusSquared))) * 0.72 - 0.18;
  const golden = GOLDEN_ANGLE * (index + 1);
  const hash = hashStringToUnit(node.id);
  const volumeX = Math.cos(golden) * 0.14 * (hash + 0.35);
  const volumeY = Math.sin(golden * 0.85) * 0.14 * (1.1 - hash);
  const volumeZ = Math.sin(golden * 1.15) * 0.16;

  return {
    x: normalizedX * 0.9 + volumeX,
    y: normalizedY * 0.9 + volumeY,
    z: paraboloidZ + volumeZ + (node.kind === 'task' ? 0.12 : 0),
  };
}

function graph3DClusterKey(node: GraphNode): string {
  if (node.kind === 'task' && node.parentRecordId) {
    return `record:${node.parentRecordId}`;
  }

  if (node.kind === 'record' && node.record) {
    if (node.record.folderId) {
      return `folder:${node.record.folderId}`;
    }

    const primaryTag = (node.record.tags ?? [])
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .sort()[0];

    if (primaryTag) {
      return `tag:${primaryTag}`;
    }
  }

  return `solo:${node.id}`;
}

function resolveTaskParentClusterKey(
  node: GraphNode,
  containsParentByTaskId: Map<string, string>,
  nodeById: Map<string, GraphNode>,
): string {
  if (node.kind !== 'task') {
    return graph3DClusterKey(node);
  }

  const parentNodeId = containsParentByTaskId.get(node.id);
  const parent = parentNodeId ? nodeById.get(parentNodeId) : null;
  if (parent) {
    return graph3DClusterKey(parent);
  }

  return graph3DClusterKey(node);
}

function buildGraph3DClusters(nodes: GraphNode[], edges: GraphEdge[]): Graph3DCluster[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const containsParentByTaskId = new Map<string, string>();

  for (const edge of edges) {
    if (edge.kind === 'contains') {
      containsParentByTaskId.set(edge.targetId, edge.sourceId);
    }
  }

  const clustersById = new Map<string, Graph3DCluster>();

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const clusterId = resolveTaskParentClusterKey(node, containsParentByTaskId, nodeById);
    const cluster = clustersById.get(clusterId) ?? {
      id: clusterId,
      nodeIndices: [],
      recordCount: 0,
    };

    cluster.nodeIndices.push(index);
    if (node.kind === 'record') {
      cluster.recordCount += 1;
    }
    clustersById.set(clusterId, cluster);
  }

  return [...clustersById.values()].sort((left, right) => {
    const sizeDiff = right.nodeIndices.length - left.nodeIndices.length;
    return sizeDiff !== 0 ? sizeDiff : left.id.localeCompare(right.id);
  });
}

function chooseGraph3DLayoutTemplate(
  nodes: GraphNode[],
  clusters: Graph3DCluster[],
): Graph3DLayoutTemplate {
  if (nodes.length >= 80 || clusters.length >= 10) {
    return 'galaxyRings';
  }
  if (nodes.length >= 24 || clusters.length >= 4) {
    return 'clusterShells';
  }
  return 'constellation';
}

function clusterAnchorForTemplate(
  clusterIndex: number,
  clusterCount: number,
  template: Graph3DLayoutTemplate,
): Graph3DLayoutPoint {
  if (template === 'constellation') {
    return { x: 0, y: 0, z: 0 };
  }

  if (template === 'clusterShells') {
    const t = (clusterIndex + 0.5) / Math.max(clusterCount, 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = GOLDEN_ANGLE * clusterIndex;
    const radius = 0.72 + Math.min(clusterCount, 12) * 0.018;

    return {
      x: Math.sin(inclination) * Math.cos(azimuth) * radius,
      y: Math.sin(inclination) * Math.sin(azimuth) * radius,
      z: Math.cos(inclination) * radius * 0.86,
    };
  }

  const ringIndex = Math.floor(Math.sqrt(clusterIndex));
  const firstInRing = ringIndex * ringIndex;
  const itemsInRing = Math.max(1, (ringIndex + 1) * (ringIndex + 1) - firstInRing);
  const ringOffset = clusterIndex - firstInRing;
  const angle = (ringOffset / itemsInRing) * Math.PI * 2 + ringIndex * 0.42;
  const radius = 0.32 + ringIndex * 0.34;
  const layer = ringIndex % 3;
  const z = (layer - 1) * 0.34 + Math.sin(angle * 1.7) * 0.12;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z,
  };
}

function localClusterOffset(
  node: GraphNode,
  localIndex: number,
  clusterSize: number,
  template: Graph3DLayoutTemplate,
): Graph3DLayoutPoint {
  const t = (localIndex + 0.5) / Math.max(clusterSize, 1);
  const angle = GOLDEN_ANGLE * (localIndex + 1);
  const isTask = node.kind === 'task';

  if (template === 'galaxyRings') {
    const radius = Math.sqrt(t) * (0.13 + Math.min(clusterSize, 24) * 0.004);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: (t - 0.5) * 0.18 + (isTask ? 0.08 : 0),
    };
  }

  if (template === 'clusterShells') {
    const inclination = Math.acos(1 - 2 * t);
    const radius = 0.12 + Math.min(clusterSize, 18) * 0.004;
    return {
      x: Math.sin(inclination) * Math.cos(angle) * radius,
      y: Math.sin(inclination) * Math.sin(angle) * radius,
      z: Math.cos(inclination) * radius + (isTask ? 0.07 : 0),
    };
  }

  return {
    x: Math.cos(angle) * 0.08 * (0.75 + t),
    y: Math.sin(angle) * 0.08 * (0.75 + t),
    z: Math.sin(angle * 1.3) * 0.08 + (isTask ? 0.1 : 0),
  };
}

function applyTemplateGraph3DPositions(
  nodes: GraphNode[],
  clusters: Graph3DCluster[],
  template: Graph3DLayoutTemplate,
): {
  anchors: Graph3DLayoutPoint[];
  positions: Graph3DLayoutPoint[];
} {
  const positions: Graph3DLayoutPoint[] = Array.from({ length: nodes.length }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));
  const anchors: Graph3DLayoutPoint[] = Array.from({ length: nodes.length }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));

  for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex += 1) {
    const cluster = clusters[clusterIndex];
    const anchor = clusterAnchorForTemplate(clusterIndex, clusters.length, template);

    for (let localIndex = 0; localIndex < cluster.nodeIndices.length; localIndex += 1) {
      const nodeIndex = cluster.nodeIndices[localIndex];
      const offset = localClusterOffset(
        nodes[nodeIndex],
        localIndex,
        cluster.nodeIndices.length,
        template,
      );
      const position = {
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
        z: anchor.z + offset.z,
      };

      positions[nodeIndex] = position;
      anchors[nodeIndex] = { ...position };
    }
  }

  return { anchors, positions };
}

function normalizeGraph3DLayout(
  positions: Graph3DLayoutPoint[],
  targetRadius: number,
  anchors?: Graph3DLayoutPoint[],
): void {
  let maxRadius = 0;

  for (const position of positions) {
    maxRadius = Math.max(maxRadius, Math.hypot(position.x, position.y, position.z));
  }

  if (maxRadius <= 0) {
    return;
  }

  const scale = targetRadius / maxRadius;

  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    position.x *= scale;
    position.y *= scale;
    position.z *= scale;

    if (anchors?.[index]) {
      anchors[index].x *= scale;
      anchors[index].y *= scale;
      anchors[index].z *= scale;
    }
  }
}

function relaxGraph3DLayout(
  positions: Graph3DLayoutPoint[],
  edges: GraphEdge[],
  nodeIndexById: Map<string, number>,
  anchors: Graph3DLayoutPoint[],
  options: Graph3DRelaxOptions,
): void {
  const nodeCount = positions.length;
  if (nodeCount <= 1) {
    return;
  }

  const damping = 0.82;
  const forces: Graph3DLayoutPoint[] = Array.from({ length: nodeCount }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));

  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    for (let index = 0; index < nodeCount; index += 1) {
      forces[index].x = 0;
      forces[index].y = 0;
      forces[index].z = 0;
    }

    for (let left = 0; left < nodeCount; left += 1) {
      for (let right = left + 1; right < nodeCount; right += 1) {
        const dx = positions[left].x - positions[right].x;
        const dy = positions[left].y - positions[right].y;
        const dz = positions[left].z - positions[right].z;
        const distance = Math.max(Math.hypot(dx, dy, dz), 0.06);
        const force = options.repulsionStrength / (distance * distance);

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;

        forces[left].x += fx;
        forces[left].y += fy;
        forces[left].z += fz;
        forces[right].x -= fx;
        forces[right].y -= fy;
        forces[right].z -= fz;
      }
    }

    for (const edge of edges) {
      const sourceIndex = nodeIndexById.get(edge.sourceId);
      const targetIndex = nodeIndexById.get(edge.targetId);

      if (sourceIndex == null || targetIndex == null || sourceIndex === targetIndex) {
        continue;
      }

      const source = positions[sourceIndex];
      const target = positions[targetIndex];
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.max(Math.hypot(dx, dy, dz), 0.05);
      const desiredDistance =
        edge.kind === 'contains' ? 0.14 : edge.kind === 'similar' ? 0.52 : 0.38;
      const force = options.attractionStrength * (distance - desiredDistance);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;

      forces[sourceIndex].x += fx;
      forces[sourceIndex].y += fy;
      forces[sourceIndex].z += fz;
      forces[targetIndex].x -= fx;
      forces[targetIndex].y -= fy;
      forces[targetIndex].z -= fz;
    }

    for (let index = 0; index < nodeCount; index += 1) {
      forces[index].x -= positions[index].x * options.centerPull;
      forces[index].y -= positions[index].y * options.centerPull;
      forces[index].z -= positions[index].z * options.centerPull;
      forces[index].x += (anchors[index].x - positions[index].x) * options.anchorStrength;
      forces[index].y += (anchors[index].y - positions[index].y) * options.anchorStrength;
      forces[index].z += (anchors[index].z - positions[index].z) * options.anchorStrength;

      positions[index].x += forces[index].x * damping;
      positions[index].y += forces[index].y * damping;
      positions[index].z += forces[index].z * damping;
    }
  }
}

function relaxOptionsForTemplate(
  template: Graph3DLayoutTemplate,
  nodeCount: number,
): Graph3DRelaxOptions {
  if (template === 'galaxyRings') {
    return {
      attractionStrength: 0.038,
      centerPull: 0.002,
      anchorStrength: 0.07,
      iterations: nodeCount > 140 ? 6 : 8,
      repulsionStrength: nodeCount > 140 ? 0.014 : 0.018,
    };
  }

  if (template === 'clusterShells') {
    return {
      attractionStrength: 0.058,
      centerPull: 0.006,
      anchorStrength: 0.045,
      iterations: nodeCount > 60 ? 10 : 12,
      repulsionStrength: 0.014,
    };
  }

  return {
    attractionStrength: 0.085,
    centerPull: 0.018,
    anchorStrength: 0.018,
    iterations: 16,
    repulsionStrength: 0.011,
  };
}

function bindTaskNodesToParents(
  positions: Graph3DLayoutPoint[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeIndexById: Map<string, number>,
): void {
  for (const edge of edges) {
    if (edge.kind !== 'contains') {
      continue;
    }

    const parentIndex = nodeIndexById.get(edge.sourceId);
    const childIndex = nodeIndexById.get(edge.targetId);

    if (parentIndex == null || childIndex == null) {
      continue;
    }

    if (nodes[childIndex]?.kind !== 'task') {
      continue;
    }

    const parent = positions[parentIndex];
    const child = positions[childIndex];

    child.x = parent.x * 0.28 + child.x * 0.72;
    child.y = parent.y * 0.28 + child.y * 0.72;
    child.z = parent.z + 0.2;
  }
}

export function buildGraph3DLayout(nodes: GraphNode[], edges: GraphEdge[]): Graph3DLayoutResult {
  const center = computeGraphCenter(nodes);
  const extent = computeGraph3DExtent(nodes, center);
  const nodeIndexById = new Map<string, number>();
  const nodeKinds: number[] = [];
  const clusters = buildGraph3DClusters(nodes, edges);
  const template = chooseGraph3DLayoutTemplate(nodes, clusters);
  const templateLayout =
    template === 'constellation' ? null : applyTemplateGraph3DPositions(nodes, clusters, template);
  const positions: Graph3DLayoutPoint[] = [];
  const anchors: Graph3DLayoutPoint[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    nodeIndexById.set(node.id, index);
    nodeKinds.push(node.kind === 'task' ? 1 : 0);

    if (templateLayout) {
      positions.push(templateLayout.positions[index]);
      anchors.push(templateLayout.anchors[index]);
    } else {
      const position = initialGraph3DPosition(node, index, center, extent);
      positions.push(position);
      anchors.push({ ...position });
    }
  }

  normalizeGraph3DLayout(positions, template === 'galaxyRings' ? 1.28 : 1.04, anchors);
  bindTaskNodesToParents(positions, nodes, edges, nodeIndexById);
  relaxGraph3DLayout(
    positions,
    edges,
    nodeIndexById,
    anchors,
    relaxOptionsForTemplate(template, nodes.length),
  );
  bindTaskNodesToParents(positions, nodes, edges, nodeIndexById);
  normalizeGraph3DLayout(positions, template === 'galaxyRings' ? 1.18 : 0.98);

  const nodePoints: number[] = [];

  for (const position of positions) {
    nodePoints.push(position.x, position.y, position.z);
  }

  return { nodePoints, nodeKinds };
}
