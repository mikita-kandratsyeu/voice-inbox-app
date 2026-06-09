import type { Colors } from '@/shared/config';

import type { GraphEdge, GraphEdgeKind } from './graphTypes';

export type GraphEdgeStrokeStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  opacity: number;
};

export type GraphEdgeEmphasis = 'default' | 'dimmed' | 'highlighted';

export function resolveGraphEdgeEmphasis(
  edge: GraphEdge,
  matchedNodeIds: ReadonlySet<string> | null,
  activeNodeId: string | null,
): GraphEdgeEmphasis {
  const touchesActive =
    activeNodeId != null &&
    (edge.sourceId === activeNodeId || edge.targetId === activeNodeId);

  if (touchesActive) return 'highlighted';

  if (matchedNodeIds && matchedNodeIds.size > 0) {
    const sourceMatch = matchedNodeIds.has(edge.sourceId);
    const targetMatch = matchedNodeIds.has(edge.targetId);
    if (sourceMatch && targetMatch) return 'highlighted';
    if (!sourceMatch && !targetMatch) return 'dimmed';
  }

  return 'default';
}

export function getLegendEdgeStrokeStyle(
  kind: GraphEdgeKind,
  color: Colors,
): GraphEdgeStrokeStyle {
  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: 3,
        strokeLinecap: 'round',
        opacity: 1,
      };
    case 'sharedTag':
      return {
        stroke: color.text.primary,
        strokeWidth: 2.5,
        strokeDasharray: '8 5',
        strokeLinecap: 'round',
        opacity: 0.72,
      };
    case 'sameFolder':
      return {
        stroke: color.text.secondary,
        strokeWidth: 2.75,
        strokeDasharray: '1 6',
        strokeLinecap: 'round',
        opacity: 0.9,
      };
    case 'contains':
    default:
      return {
        stroke: color.text.muted,
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        opacity: 0.95,
      };
  }
}

function baseGraphEdgeStrokeStyle(kind: GraphEdgeKind, color: Colors): GraphEdgeStrokeStyle {
  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: 2,
        strokeLinecap: 'round',
        opacity: 0.68,
      };
    case 'sharedTag':
      return {
        stroke: color.text.secondary,
        strokeWidth: 1.35,
        strokeDasharray: '6 5',
        strokeLinecap: 'round',
        opacity: 0.42,
      };
    case 'sameFolder':
      return {
        stroke: color.border.default,
        strokeWidth: 1.1,
        strokeDasharray: '2 8',
        strokeLinecap: 'round',
        opacity: 0.32,
      };
    case 'contains':
    default:
      return {
        stroke: color.text.muted,
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        opacity: 0.48,
      };
  }
}

export function getGraphEdgeStrokeStyle(
  kind: GraphEdgeKind,
  color: Colors,
  emphasis: GraphEdgeEmphasis = 'default',
): GraphEdgeStrokeStyle {
  const base = baseGraphEdgeStrokeStyle(kind, color);

  if (emphasis === 'dimmed') {
    return { ...base, opacity: base.opacity * 0.2 };
  }

  if (emphasis === 'highlighted') {
    return {
      ...base,
      stroke: kind === 'similar' ? color.accent.primary : base.stroke,
      strokeWidth: base.strokeWidth + (kind === 'similar' ? 1.25 : 0.75),
      opacity: Math.min(1, base.opacity + 0.34),
      strokeDasharray: kind === 'sharedTag' ? '7 4' : base.strokeDasharray,
    };
  }

  return base;
}

export function getGraphEdgeGlowStyle(
  kind: GraphEdgeKind,
  color: Colors,
): GraphEdgeStrokeStyle | null {
  if (kind !== 'similar') return null;

  return {
    stroke: color.accent.primary,
    strokeWidth: 6,
    strokeLinecap: 'round',
    opacity: 0.16,
  };
}
