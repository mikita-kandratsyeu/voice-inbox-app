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
import type { GraphEdge, GraphNode, GraphNodeDisplayMode } from '../lib/graphTypes';
import { GraphEdgeLayerSvg } from './GraphEdgeLayerSvg';
import { GraphNodeLayer } from './GraphNodeLayer';

type GraphFullExportCaptureProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graphWidth: number;
  graphHeight: number;
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  nodeDisplayMode?: GraphNodeDisplayMode;
};

export const GraphFullExportCapture = forwardRef<ViewShotRef, GraphFullExportCaptureProps>(
  function GraphFullExportCapture(
    {
      nodes,
      edges,
      graphWidth,
      graphHeight,
      color,
      foldersById,
      isProActive,
      nodeDisplayMode = 'cards',
    },
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
          left: -(layout.exportWidth + 64),
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
            height: layout.exportHeight,
            width: layout.exportWidth,
            overflow: 'visible',
          }}
        >
          <View
            style={{
              height: layout.worldHeight,
              overflow: 'visible',
              transform: [
                { scale: layout.transform.scale },
                { translateX: layout.transform.translateX },
                { translateY: layout.transform.translateY },
              ],
              transformOrigin: 'left top',
              width: layout.worldWidth,
            }}
          >
            <GraphEdgeLayerSvg
              nodes={nodes}
              edges={edges}
              color={color}
              width={layout.worldWidth}
              height={layout.worldHeight}
              matchedNodeIds={null}
              activeNodeId={null}
              nodeDisplayMode={nodeDisplayMode}
            />
            <GraphNodeLayer
              nodes={nodes}
              edges={edges}
              color={color}
              foldersById={foldersById}
              isProActive={isProActive}
              matchedNodeIds={null}
              activeNodeId={null}
              canvasScale={canvasScale}
              interactionsEnabled={false}
              nodeDisplayMode={nodeDisplayMode}
              onRecordPress={noop}
              onTaskPress={noop}
              onNodeDragStart={noop}
              onNodeDragEnd={noop}
              onNodeDragCancel={noop}
              onNodeFocus={noop}
            />
          </View>
        </ViewShot>
      </View>
    );
  },
);
