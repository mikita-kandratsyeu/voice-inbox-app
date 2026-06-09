import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from '../lib/graphTypes';
import type { GraphNodeInteractionState } from './graphNodeInteraction';

type GraphNodeCardProps = {
  node: GraphNode;
  color: Colors;
  folderName?: string;
  folderColor?: string;
  isProActive: boolean;
  highlighted: boolean;
  interactionState?: GraphNodeInteractionState;
  onPress: () => void;
};

function interactionCardStyle(
  interactionState: GraphNodeInteractionState,
  color: Colors,
  dimmed: boolean,
): {
  opacity: number;
  transform: { scale: number }[];
  borderWidth: number;
  borderColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
} {
  switch (interactionState) {
    case 'pressing':
      return {
        opacity: dimmed ? 0.5 : 0.94,
        transform: [{ scale: 0.97 }],
        borderWidth: 1.5,
        borderColor: color.accent.primary,
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      };
    case 'dragging':
      return {
        opacity: 1,
        transform: [{ scale: 1.04 }],
        borderWidth: 2,
        borderColor: color.accent.primary,
        shadowOpacity: 0.16,
        shadowRadius: 12,
        elevation: 8,
      };
    default:
      return {
        opacity: dimmed ? 0.28 : 1,
        transform: [{ scale: 1 }],
        borderWidth: 0,
        borderColor: color.border.default,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      };
  }
}

function RecordNodeCard({
  record,
  color,
  folderName,
  folderColor,
  highlighted,
  dimmed,
  active,
  interactionState = 'idle',
  onPress,
}: {
  record: VoiceRecord;
  color: Colors;
  folderName?: string;
  folderColor?: string;
  highlighted: boolean;
  dimmed?: boolean;
  active?: boolean;
  interactionState?: GraphNodeInteractionState;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const openTasks = (record.tasks ?? []).filter((t) => !t.isDone).length;
  const accent = folderColor ?? color.accent.primary;
  const isUnread = record.status === 'unread';
  const interaction = interactionCardStyle(interactionState, color, dimmed ?? false);
  const isDragging = interactionState === 'dragging';
  const borderWidth =
    interactionState !== 'idle' ? interaction.borderWidth : active ? 2.5 : highlighted ? 2 : 1;
  const borderColor =
    interactionState !== 'idle'
      ? interaction.borderColor
      : active || highlighted
        ? color.accent.primary
        : color.border.default;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        width: RECORD_NODE_WIDTH,
        minHeight: RECORD_NODE_HEIGHT,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: color.background.primary,
        borderWidth,
        borderColor,
        opacity: interaction.opacity,
        transform: interaction.transform,
        shadowColor: '#000',
        shadowOpacity: interaction.shadowOpacity,
        shadowRadius: interaction.shadowRadius,
        shadowOffset: { width: 0, height: isDragging ? 4 : 2 },
        elevation: interaction.elevation,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: 2,
          backgroundColor: accent,
        }}
      />
      <Text
        numberOfLines={2}
        style={{
          color: color.text.primary,
          fontSize: 13,
          fontWeight: '600',
          lineHeight: 17,
          paddingLeft: 6,
        }}
      >
        {record.title}
      </Text>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 6 }}
      >
        {folderName ? (
          <Text
            numberOfLines={1}
            style={{ color: color.text.secondary, fontSize: 11, flexShrink: 1 }}
          >
            {folderName}
          </Text>
        ) : null}
        {openTasks > 0 ? (
          <Text style={{ color: color.text.muted, fontSize: 11 }}>
            {t('notesGraph.node.openTasks', { count: openTasks })}
          </Text>
        ) : null}
        {isUnread ? (
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: color.accent.primary,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function TaskNodeCard({
  text,
  color,
  highlighted,
  dimmed,
  active,
  interactionState = 'idle',
  onPress,
}: {
  text: string;
  color: Colors;
  highlighted: boolean;
  dimmed?: boolean;
  active?: boolean;
  interactionState?: GraphNodeInteractionState;
  onPress: () => void;
}) {
  const interaction = interactionCardStyle(interactionState, color, dimmed ?? false);
  const isDragging = interactionState === 'dragging';
  const borderWidth =
    interactionState !== 'idle' ? interaction.borderWidth : active ? 2.5 : highlighted ? 2 : 1;
  const borderColor =
    interactionState !== 'idle'
      ? interaction.borderColor
      : active || highlighted
        ? color.accent.primary
        : color.border.default;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        width: TASK_NODE_WIDTH,
        minHeight: TASK_NODE_HEIGHT,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: color.background.tertiary,
        borderWidth,
        borderColor,
        opacity: interaction.opacity,
        transform: interaction.transform,
        shadowColor: isDragging ? '#000' : undefined,
        shadowOpacity: isDragging ? interaction.shadowOpacity : undefined,
        shadowRadius: isDragging ? interaction.shadowRadius : undefined,
        shadowOffset: isDragging ? { width: 0, height: 3 } : undefined,
        elevation: isDragging ? interaction.elevation : undefined,
      }}
    >
      <Text numberOfLines={2} style={{ color: color.text.primary, fontSize: 12, lineHeight: 15 }}>
        {text}
      </Text>
    </Pressable>
  );
}

export function GraphNodeCard({
  node,
  color,
  folderName,
  folderColor,
  folderIcon,
  isProActive,
  highlighted,
  dimmed = false,
  active = false,
  interactionState = 'idle',
  onPress,
}: GraphNodeCardProps & { folderIcon?: string; dimmed?: boolean; active?: boolean }) {
  const { t } = useTranslation();
  const scheme = useAppTheme();

  if (node.kind === 'task' && node.task) {
    return (
      <TaskNodeCard
        text={node.task.text}
        color={color}
        highlighted={highlighted}
        dimmed={dimmed}
        active={active}
        interactionState={interactionState}
        onPress={onPress}
      />
    );
  }

  if (node.kind === 'record' && node.record) {
    const classificationLabel =
      node.record.classification && !node.record.folderId
        ? t(`classification.${node.record.classification}`)
        : null;
    const chrome = resolveFolderListRowChrome({
      folder:
        folderName && folderColor
          ? { name: folderName, color: folderColor, icon: folderIcon ?? '📁' }
          : null,
      folderId: node.record.folderId,
      classification: node.record.classification,
      isProActive,
      scheme,
      labels: {
        inbox: t('tabs.inbox'),
        folderRemoved: t('folders.detailFolderRemoved'),
        classificationLabel,
      },
    });
    return (
      <RecordNodeCard
        record={node.record}
        color={color}
        folderName={chrome.locationLabel}
        folderColor={
          node.record.folderId && folderColor
            ? resolveDisplayFolderColor(folderColor, isProActive)
            : undefined
        }
        highlighted={highlighted}
        dimmed={dimmed}
        active={active}
        interactionState={interactionState}
        onPress={onPress}
      />
    );
  }

  return null;
}

export function GraphNodeCardWrapper({
  node,
  interactionState = 'idle',
  children,
}: {
  node: GraphNode;
  interactionState?: GraphNodeInteractionState;
  children: React.ReactNode;
}) {
  const width = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;
  const zIndex =
    interactionState === 'dragging' ? 20 : interactionState === 'pressing' ? 10 : undefined;

  return (
    <View
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width,
        zIndex,
      }}
    >
      {children}
    </View>
  );
}
