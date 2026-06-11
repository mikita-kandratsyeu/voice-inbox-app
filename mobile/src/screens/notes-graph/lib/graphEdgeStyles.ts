import type { Colors } from '@/shared/config';

import type { GraphEdge, GraphEdgeKind } from './graphTypes';

export type GraphEdgeStrokeStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  opacity: number;
  strokeGradient?: {
    id: string;
    colors: string[];
  };
  animated?: boolean;
};

export type GraphEdgeEmphasis = 'default' | 'dimmed' | 'highlighted';

export function resolveGraphEdgeEmphasis(
  edge: GraphEdge,
  matchedNodeIds: ReadonlySet<string> | null,
  activeNodeId: string | null,
): GraphEdgeEmphasis {
  const touchesActive =
    activeNodeId != null && (edge.sourceId === activeNodeId || edge.targetId === activeNodeId);

  if (touchesActive) return 'highlighted';

  if (matchedNodeIds && matchedNodeIds.size > 0) {
    const sourceMatch = matchedNodeIds.has(edge.sourceId);
    const targetMatch = matchedNodeIds.has(edge.targetId);
    if (sourceMatch && targetMatch) return 'highlighted';
    if (!sourceMatch && !targetMatch) return 'dimmed';
  }

  return 'default';
}

export function getLegendEdgeStrokeStyle(kind: GraphEdgeKind, color: Colors): GraphEdgeStrokeStyle {
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
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        opacity: 0.85,
        strokeGradient: {
          id: 'similar-gradient',
          colors: [color.accent.primary, adjustColorOpacity(color.accent.primary, 0.6)],
        },
        animated: true,
      };
    case 'sharedTag':
      return {
        stroke: color.text.secondary,
        strokeWidth: 2,
        strokeDasharray: '8 4',
        strokeLinecap: 'round',
        opacity: 0.65,
      };
    case 'sameFolder':
      return {
        stroke: color.border.default,
        strokeWidth: 1.8,
        strokeDasharray: '3 6',
        strokeLinecap: 'round',
        opacity: 0.5,
      };
    case 'contains':
    default:
      return {
        stroke: adjustColorOpacity(color.accent.primary, 0.4),
        strokeWidth: 2,
        strokeLinecap: 'round',
        opacity: 0.7,
        strokeDasharray: '1 0',
      };
  }
}

function adjustColorOpacity(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

export function getGraphEdgeStrokeStyle(
  kind: GraphEdgeKind,
  color: Colors,
  emphasis: GraphEdgeEmphasis = 'default',
): GraphEdgeStrokeStyle {
  const base = baseGraphEdgeStrokeStyle(kind, color);

  if (emphasis === 'dimmed') {
    return { ...base, opacity: base.opacity * 0.2, animated: false };
  }

  if (emphasis === 'highlighted') {
    return {
      ...base,
      stroke: kind === 'similar' ? color.accent.primary : base.stroke,
      strokeWidth: base.strokeWidth + (kind === 'similar' ? 1.8 : 1.2),
      opacity: Math.min(1, base.opacity + 0.25),
      strokeDasharray: kind === 'sharedTag' ? '10 3' : base.strokeDasharray,
      animated: true,
    };
  }

  return base;
}

export function getGraphEdgeGlowStyle(
  kind: GraphEdgeKind,
  color: Colors,
): GraphEdgeStrokeStyle | null {
  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: 9,
        strokeLinecap: 'round',
        opacity: 0.35,
        animated: true,
      };
    case 'contains':
      return {
        stroke: adjustColorOpacity(color.accent.primary, 0.3),
        strokeWidth: 7,
        strokeLinecap: 'round',
        opacity: 0.25,
      };
    default:
      return null;
  }
}
