import React, { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import { buildGraphRenderedEdges } from '../lib/buildGraphRenderedEdges';
import { getGraphEdgeGlowStyle, getGraphEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';

type GraphEdgeLayerSvgProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  width: number;
  height: number;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
};

/**
 * SVG edge layer for ViewShot export. Skia Canvas is not captured by react-native-view-shot.
 */
export const GraphEdgeLayerSvg = React.memo(function GraphEdgeLayerSvg({
  nodes,
  edges,
  color,
  width,
  height,
  matchedNodeIds,
  activeNodeId,
}: GraphEdgeLayerSvgProps) {
  const renderedEdges = useMemo(
    () => buildGraphRenderedEdges(nodes, edges, matchedNodeIds, activeNodeId, null),
    [activeNodeId, edges, matchedNodeIds, nodes],
  );

  if (renderedEdges.length === 0) {
    return null;
  }

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        {renderedEdges.map(({ edge, emphasis }) => {
          const style = getGraphEdgeStrokeStyle(edge.kind, color, emphasis);
          if (style.strokeGradient) {
            return (
              <LinearGradient
                key={style.strokeGradient.id + edge.id}
                id={`${style.strokeGradient.id}-${edge.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                {style.strokeGradient.colors.map((gradientColor, index) => (
                  <Stop
                    key={index}
                    offset={`${(index * 100) / (style.strokeGradient!.colors.length - 1)}%`}
                    stopColor={gradientColor}
                  />
                ))}
              </LinearGradient>
            );
          }
          return null;
        })}
      </Defs>
      {renderedEdges.map(({ edge, path, emphasis }) => {
        const style = getGraphEdgeStrokeStyle(edge.kind, color, emphasis);
        const glow = emphasis === 'highlighted' ? getGraphEdgeGlowStyle(edge.kind, color) : null;
        const useGradient = style.strokeGradient && emphasis !== 'dimmed';

        return (
          <React.Fragment key={edge.id}>
            {glow ? (
              <Path
                d={path}
                stroke={glow.stroke}
                strokeWidth={glow.strokeWidth}
                strokeLinecap={glow.strokeLinecap ?? 'round'}
                opacity={glow.opacity}
                fill="none"
              />
            ) : null}
            <Path
              d={path}
              stroke={useGradient ? `url(#${style.strokeGradient!.id}-${edge.id})` : style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              strokeLinecap={style.strokeLinecap ?? 'round'}
              opacity={style.opacity}
              fill="none"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
});
