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

  if (activeNodeId != null) {
    return touchesActive ? 'highlighted' : 'dimmed';
  }

  if (matchedNodeIds && matchedNodeIds.size > 0) {
    const sourceMatch = matchedNodeIds.has(edge.sourceId);
    const targetMatch = matchedNodeIds.has(edge.targetId);
    if (sourceMatch && targetMatch) return 'highlighted';
    if (!sourceMatch && !targetMatch) return 'dimmed';
  }

  return 'default';
}

function isLightGraphBackground(color: Colors): boolean {
  const hex = color.background.secondary;
  if (!hex.startsWith('#') || hex.length < 7) return false;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.7;
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

function resolveGraphEdgeKindStyle(kind: GraphEdgeKind, color: Colors): GraphEdgeStrokeStyle {
  const onLight = isLightGraphBackground(color);

  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: onLight ? 2.75 : 2.5,
        strokeLinecap: 'round',
        opacity: onLight ? 0.92 : 0.85,
        strokeGradient: {
          id: 'similar-gradient',
          colors: [
            color.accent.primary,
            adjustColorOpacity(color.accent.primary, onLight ? 0.78 : 0.6),
          ],
        },
        animated: true,
      };
    case 'sharedTag':
      return {
        stroke: onLight ? color.text.primary : color.text.secondary,
        strokeWidth: onLight ? 2.3 : 2,
        strokeDasharray: '8 4',
        strokeLinecap: 'round',
        opacity: onLight ? 0.52 : 0.72,
      };
    case 'sameFolder':
      return {
        stroke: color.text.secondary,
        strokeWidth: onLight ? 2.1 : 1.8,
        strokeDasharray: onLight ? '2 5' : '3 6',
        strokeLinecap: 'round',
        opacity: onLight ? 0.88 : 0.62,
      };
    case 'linked':
      return {
        stroke: color.accent.success,
        strokeWidth: onLight ? 2.6 : 2.4,
        strokeLinecap: 'round',
        opacity: onLight ? 0.96 : 0.9,
      };
    case 'contains':
    default:
      return {
        stroke: onLight
          ? adjustColorOpacity(color.accent.primary, 0.82)
          : adjustColorOpacity(color.accent.primary, 0.55),
        strokeWidth: onLight ? 2.3 : 2,
        strokeLinecap: 'round',
        opacity: onLight ? 0.88 : 0.72,
        strokeDasharray: '1 0',
      };
  }
}

export function getLegendEdgeStrokeStyle(kind: GraphEdgeKind, color: Colors): GraphEdgeStrokeStyle {
  const base = resolveGraphEdgeKindStyle(kind, color);

  return {
    ...base,
    strokeWidth: base.strokeWidth + 0.25,
    opacity: Math.min(1, base.opacity + 0.08),
    strokeGradient: undefined,
    animated: false,
  };
}

function baseGraphEdgeStrokeStyle(kind: GraphEdgeKind, color: Colors): GraphEdgeStrokeStyle {
  return resolveGraphEdgeKindStyle(kind, color);
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
  const onLight = isLightGraphBackground(color);

  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: 9,
        strokeLinecap: 'round',
        opacity: onLight ? 0.42 : 0.35,
        animated: true,
      };
    case 'contains':
      return {
        stroke: adjustColorOpacity(color.accent.primary, onLight ? 0.45 : 0.3),
        strokeWidth: 7,
        strokeLinecap: 'round',
        opacity: onLight ? 0.32 : 0.25,
      };
    case 'linked':
      return {
        stroke: color.accent.success,
        strokeWidth: 7,
        strokeLinecap: 'round',
        opacity: onLight ? 0.28 : 0.22,
      };
    default:
      return null;
  }
}
