import React, { forwardRef, useMemo } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';

import {
  computeGraphExportLayout,
  getGraphExportViewShotCaptureOptions,
  getGraphExportViewShotMaxDimension,
} from '../lib/computeGraphExportLayout';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import { DottedBackground } from './DottedBackground';
import { GraphEdgeLayer } from './GraphEdgeLayer';
import { GraphNodeLayer } from './GraphNodeLayer';

type GraphFullExportCaptureProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graphWidth: number;
  graphHeight: number;
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
};

export const GraphFullExportCapture = forwardRef<ViewShotRef, GraphFullExportCaptureProps>(
  function GraphFullExportCapture(
    { nodes, edges, graphWidth, graphHeight, color, foldersById, isProActive },
    ref,
  ) {
    const viewShotMaxDimension = useMemo(() => getGraphExportViewShotMaxDimension(), []);

    const layout = useMemo(
      () => computeGraphExportLayout(nodes, graphWidth, graphHeight, viewShotMaxDimension),
      [graphHeight, graphWidth, nodes, viewShotMaxDimension],
    );
    const canvasScale = useSharedValue(1);

    if (!layout) {
      return null;
    }

    const noop = () => {};

    return (
      <View
        collapsable={false}
        pointerEvents="none"
        style={{
          height: layout.exportHeight,
          left: 0,
          opacity: 0,
          position: 'absolute',
          top: 0,
          width: layout.exportWidth,
          zIndex: -1,
        }}
      >
        <ViewShot
          ref={ref}
          options={getGraphExportViewShotCaptureOptions()}
          style={{
            backgroundColor: color.background.secondary,
            height: layout.exportHeight,
            width: layout.exportWidth,
          }}
        >
          <DottedBackground
            width={layout.exportWidth}
            height={layout.exportHeight}
            dotColor={color.text.muted}
          />
          <View
            style={{
              height: layout.worldHeight,
              transform: [
                { translateX: layout.transform.translateX },
                { translateY: layout.transform.translateY },
                { scale: layout.transform.scale },
              ],
              transformOrigin: 'left top',
              width: layout.worldWidth,
            }}
          >
            <GraphEdgeLayer
              nodes={nodes}
              edges={edges}
              color={color}
              width={layout.worldWidth}
              height={layout.worldHeight}
              matchedNodeIds={null}
              activeNodeId={null}
            />
            <GraphNodeLayer
              nodes={nodes}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              matchedNodeIds={null}
              activeNodeId={null}
              canvasScale={canvasScale}
              interactionsEnabled={false}
              onRecordPress={noop}
              onTaskPress={noop}
              onNodeDragStart={noop}
              onNodeDragEnd={noop}
              onNodeDragCancel={noop}
            />
          </View>
        </ViewShot>
      </View>
    );
  },
);
