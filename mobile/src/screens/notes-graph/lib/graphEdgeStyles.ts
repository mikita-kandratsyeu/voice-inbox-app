import type { Colors } from '@/shared/config';

import type { GraphEdgeKind } from './graphTypes';

export type GraphEdgeStrokeStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  opacity: number;
};

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

export function getGraphEdgeStrokeStyle(
  kind: GraphEdgeKind,
  color: Colors,
): GraphEdgeStrokeStyle {
  switch (kind) {
    case 'similar':
      return {
        stroke: color.accent.primary,
        strokeWidth: 1.75,
        strokeLinecap: 'round',
        opacity: 0.62,
      };
    case 'sharedTag':
      return {
        stroke: color.text.secondary,
        strokeWidth: 1.25,
        strokeDasharray: '5 4',
        strokeLinecap: 'round',
        opacity: 0.38,
      };
    case 'sameFolder':
      return {
        stroke: color.border.default,
        strokeWidth: 1,
        strokeDasharray: '2 7',
        strokeLinecap: 'round',
        opacity: 0.28,
      };
    case 'contains':
    default:
      return {
        stroke: color.text.muted,
        strokeWidth: 1.1,
        strokeLinecap: 'round',
        opacity: 0.42,
      };
  }
}
