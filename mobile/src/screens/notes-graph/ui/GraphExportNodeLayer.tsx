import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';

import type { GraphNode, GraphNodeDisplayMode } from '../lib/graphTypes';
import { GraphExportNode } from './GraphExportNode';

type GraphExportNodeLayerProps = {
  nodes: GraphNode[];
  color: Colors;
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  nodeDisplayMode?: GraphNodeDisplayMode;
};

export const GraphExportNodeLayer = React.memo(function GraphExportNodeLayer({
  nodes,
  color,
  foldersById,
  isProActive,
  nodeDisplayMode = 'cards',
}: GraphExportNodeLayerProps) {
  const sortedNodes = useMemo(() => {
    const tasks = nodes.filter((node) => node.kind === 'task');
    const records = nodes.filter((node) => node.kind === 'record');
    return [...records, ...tasks];
  }, [nodes]);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
    >
      {sortedNodes.map((node) => {
        const folder =
          node.record?.folderId != null ? foldersById.get(node.record.folderId) : undefined;

        return (
          <GraphExportNode
            key={node.id}
            node={node}
            color={color}
            folder={folder}
            isProActive={isProActive}
            nodeDisplayMode={nodeDisplayMode}
          />
        );
      })}
    </View>
  );
});
