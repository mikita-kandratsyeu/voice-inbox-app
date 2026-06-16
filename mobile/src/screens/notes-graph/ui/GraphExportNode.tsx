import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveDisplayFolderColor, withAlphaHex } from '@/shared/lib';

import {
  GRAPH_NODE_DOT_CONTAINER_SIZE,
  GRAPH_NODE_DOT_LABEL_FONT_SIZE,
  GRAPH_NODE_DOT_LABEL_GAP,
  GRAPH_NODE_DOT_LABEL_MAX_WIDTH,
  GRAPH_NODE_DOT_SIZE,
} from '../lib/graphNodeDotLayout';
import type { GraphNode } from '../lib/graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from '../lib/graphTypes';
import { resolveGraphNodeDotLabel } from '../lib/resolveGraphNodeDotLabel';
import { GraphRecordNodeCardContent, GraphTaskNodeCardContent } from './GraphAnimatedNodeCard';

type GraphExportNodeCardShellProps = {
  width: number;
  minHeight: number;
  borderRadius: number;
  backgroundColor: string;
  accentStripeColor?: string;
  color: Colors;
  taskStyle?: boolean;
  children: React.ReactNode;
};

function GraphExportNodeCardShell({
  width,
  minHeight,
  borderRadius,
  backgroundColor,
  accentStripeColor,
  color,
  taskStyle = false,
  children,
}: GraphExportNodeCardShellProps) {
  const hasStripe = accentStripeColor != null;

  return (
    <View style={{ width, minHeight, overflow: 'visible' }}>
      <View
        style={{
          width,
          minHeight,
          borderRadius,
          backgroundColor,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: color.border.default,
          shadowColor: color.shadow.color,
          shadowOpacity: color.shadow.opacity * (taskStyle ? 0.8 : 1.1),
          shadowRadius: taskStyle ? 6 : 9,
          shadowOffset: { width: 0, height: 3 },
          elevation: taskStyle ? 2 : 4,
          flexDirection: hasStripe ? 'row' : undefined,
          alignItems: hasStripe ? 'stretch' : undefined,
          paddingHorizontal: hasStripe ? 0 : taskStyle ? 10 : 0,
          paddingVertical: hasStripe ? 0 : taskStyle ? 8 : 0,
        }}
      >
        {hasStripe ? (
          <View
            style={{
              width: 3,
              alignSelf: 'stretch',
              backgroundColor: accentStripeColor,
            }}
          />
        ) : null}
        {hasStripe ? (
          <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 9 }}>{children}</View>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </View>
    </View>
  );
}

type GraphExportNodeCardProps = {
  node: GraphNode;
  color: Colors;
  folder?: Folder;
  isProActive: boolean;
};

function GraphExportNodeCard({ node, color, folder, isProActive }: GraphExportNodeCardProps) {
  const { t } = useTranslation();
  const scheme = useAppTheme();

  if (node.kind === 'task' && node.task) {
    return (
      <GraphExportNodeCardShell
        width={TASK_NODE_WIDTH}
        minHeight={TASK_NODE_HEIGHT}
        borderRadius={10}
        backgroundColor={withAlphaHex(color.background.card, 0.97)}
        color={color}
        taskStyle
      >
        <GraphTaskNodeCardContent
          text={node.task.text}
          color={color}
          isDone={node.task.isDone}
          priority={node.task.priority}
          deadline={node.task.deadline}
          deadlineTime={node.task.deadlineTime}
        />
      </GraphExportNodeCardShell>
    );
  }

  if (node.kind === 'record' && node.record) {
    const record = node.record;
    const openTasks = (record.tasks ?? []).filter((task) => !task.isDone).length;
    const classificationLabel =
      record.classification && !record.folderId
        ? t(`classification.${record.classification}`)
        : null;
    const chrome = resolveFolderListRowChrome({
      folder: folder ? { name: folder.name, color: folder.color, icon: folder.icon } : null,
      folderId: record.folderId,
      classification: record.classification,
      isProActive,
      scheme,
      labels: {
        inbox: t('tabs.inbox'),
        folderRemoved: t('folders.detailFolderRemoved'),
        classificationLabel,
      },
    });

    const accentColor =
      record.folderId && folder?.color
        ? resolveDisplayFolderColor(folder.color, isProActive)
        : color.accent.primary;

    return (
      <GraphExportNodeCardShell
        width={RECORD_NODE_WIDTH}
        minHeight={RECORD_NODE_HEIGHT}
        borderRadius={13}
        backgroundColor={color.background.card}
        accentStripeColor={accentColor}
        color={color}
      >
        <GraphRecordNodeCardContent
          title={record.title}
          folderName={chrome.locationLabel}
          archivedLabel={record.status === 'archived' ? t('inbox.filters.archived') : undefined}
          openTasksLabel={
            openTasks > 0 ? t('notesGraph.node.openTasks', { count: openTasks }) : undefined
          }
          tags={record.tags ?? []}
          accentColor={accentColor}
          color={color}
          folderTintHex={chrome.folderTintHex}
          showInboxIcon={chrome.showInboxIcon}
          leadingFolderIconId={chrome.leadingFolderIconId}
        />
      </GraphExportNodeCardShell>
    );
  }

  return null;
}

type GraphExportNodeDotProps = {
  node: GraphNode;
  color: Colors;
  folderColor?: string;
  isProActive: boolean;
};

function GraphExportNodeDot({ node, color, folderColor, isProActive }: GraphExportNodeDotProps) {
  const label = useMemo(() => resolveGraphNodeDotLabel(node), [node]);

  const dotColor = useMemo(() => {
    if (node.kind === 'task' && node.task) {
      if (node.task.isDone) {
        return color.text.muted;
      }
      if (node.task.priority === 'high') {
        return color.accent.delete;
      }
      if (node.task.priority === 'medium') {
        return color.accent.cache;
      }
      return color.accent.primary;
    }

    if (node.kind === 'record') {
      if (folderColor) {
        return resolveDisplayFolderColor(folderColor, isProActive);
      }
      if (node.record?.status === 'archived') {
        return color.accent.archive;
      }
      return color.accent.primary;
    }

    return color.accent.primary;
  }, [color, folderColor, isProActive, node]);

  const labelStyle = useMemo(
    () => ({
      marginTop: GRAPH_NODE_DOT_LABEL_GAP,
      marginLeft: (GRAPH_NODE_DOT_CONTAINER_SIZE - GRAPH_NODE_DOT_LABEL_MAX_WIDTH) / 2,
      width: GRAPH_NODE_DOT_LABEL_MAX_WIDTH,
      fontSize: GRAPH_NODE_DOT_LABEL_FONT_SIZE,
      fontWeight: '500' as const,
      lineHeight: GRAPH_NODE_DOT_LABEL_FONT_SIZE + 3,
      textAlign: 'center' as const,
      color: color.text.muted,
      opacity: 0.88,
      textShadowColor: withAlphaHex(color.background.primary, 0.92),
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    }),
    [color.background.primary, color.text.muted],
  );

  return (
    <View style={{ width: GRAPH_NODE_DOT_CONTAINER_SIZE }} pointerEvents="none">
      <View
        style={{
          width: GRAPH_NODE_DOT_CONTAINER_SIZE,
          height: GRAPH_NODE_DOT_CONTAINER_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: GRAPH_NODE_DOT_SIZE,
            height: GRAPH_NODE_DOT_SIZE,
            borderRadius: GRAPH_NODE_DOT_SIZE / 2,
            backgroundColor: dotColor,
          }}
        />
      </View>
      {label ? (
        <Text style={labelStyle} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

type GraphExportNodeProps = {
  node: GraphNode;
  color: Colors;
  folder?: Folder;
  isProActive: boolean;
  nodeDisplayMode: 'cards' | 'dots';
};

export const GraphExportNode = React.memo(function GraphExportNode({
  node,
  color,
  folder,
  isProActive,
  nodeDisplayMode,
}: GraphExportNodeProps) {
  const shellWidth = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;

  return (
    <View
      collapsable={false}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: shellWidth,
      }}
    >
      {nodeDisplayMode === 'dots' ? (
        <GraphExportNodeDot
          node={node}
          color={color}
          folderColor={folder?.color}
          isProActive={isProActive}
        />
      ) : (
        <GraphExportNodeCard node={node} color={color} folder={folder} isProActive={isProActive} />
      )}
    </View>
  );
});
