import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SharedValue } from 'react-native-reanimated';

import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';
import {
  GraphAnimatedNodeCard,
  GraphNodeCardWrapper,
  GraphRecordNodeCardContent,
  GraphTaskNodeCardContent,
} from './GraphAnimatedNodeCard';

type GraphNodeCardProps = {
  node: GraphNode;
  color: Colors;
  folderName?: string;
  folderColor?: string;
  isProActive: boolean;
  highlighted: boolean;
  interactionPhase: SharedValue<number>;
  onPress?: () => void;
};

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
  interactionPhase,
  onPress,
}: GraphNodeCardProps & { folderIcon?: string; dimmed?: boolean; active?: boolean }) {
  const { t } = useTranslation();
  const scheme = useAppTheme();

  if (node.kind === 'task' && node.task) {
    return (
      <GraphAnimatedNodeCard
        interactionPhase={interactionPhase}
        color={color}
        dimmed={dimmed}
        active={active}
        highlighted={highlighted}
        nodeKind="task"
        onPress={onPress}
      >
        <GraphTaskNodeCardContent
          text={node.task.text}
          color={color}
          priority={node.task.priority}
          deadline={node.task.deadline}
          deadlineTime={node.task.deadlineTime}
        />
      </GraphAnimatedNodeCard>
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
      folder:
        folderName && folderColor
          ? { name: folderName, color: folderColor, icon: folderIcon ?? '📁' }
          : null,
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
      record.folderId && folderColor
        ? resolveDisplayFolderColor(folderColor, isProActive)
        : color.accent.primary;

    return (
      <GraphAnimatedNodeCard
        interactionPhase={interactionPhase}
        color={color}
        dimmed={dimmed}
        active={active}
        highlighted={highlighted}
        nodeKind="record"
        accentStripeColor={accentColor}
        onPress={onPress}
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
      </GraphAnimatedNodeCard>
    );
  }

  return null;
}

export { GraphNodeCardWrapper };
