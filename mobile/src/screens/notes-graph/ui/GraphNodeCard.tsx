import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SharedValue } from 'react-native-reanimated';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { resolveDisplayFolderColor, useMountedRef, useSafeCallback } from '@/shared/lib';

import {
  buildGraphRecordNodeAccessibilityLabel,
  buildGraphTaskNodeAccessibilityLabel,
} from '../lib/buildGraphNodeAccessibilityLabel';
import type { GraphNode } from '../lib/graphTypes';
import {
  GraphAnimatedNodeCard,
  GraphNodeCardWrapper,
  GraphRecordNodeCardContent,
  GraphTaskNodeCardContent,
} from './GraphAnimatedNodeCard';
import { GRAPH_NODE_INTERACTION_PRESSING } from './graphNodeInteraction';

function useGraphNodeInteracting(interactionPhase: SharedValue<number>): boolean {
  const mountedRef = useMountedRef();
  const [interacting, setInteracting] = useState(false);
  const safeSetInteracting = useSafeCallback(mountedRef, setInteracting);

  useAnimatedReaction(
    () => interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING,
    (next, prev) => {
      if (next !== prev) {
        scheduleOnRN(safeSetInteracting, next);
      }
    },
  );

  return interacting;
}

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

export const GraphNodeCard = React.memo(function GraphNodeCard({
  node,
  color,
  folderName,
  folderColor,
  folderIcon,
  isProActive,
  highlighted,
  dimmed = false,
  active = false,
  neighbor = false,
  interactionPhase,
  onPress,
}: GraphNodeCardProps & {
  folderIcon?: string;
  dimmed?: boolean;
  active?: boolean;
  neighbor?: boolean;
}) {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const interacting = useGraphNodeInteracting(interactionPhase);
  const isActive = active || interacting;
  const accessibilityLabel = useMemo(() => {
    if (node.kind === 'task') {
      return buildGraphTaskNodeAccessibilityLabel(node, t);
    }
    return buildGraphRecordNodeAccessibilityLabel(node, t, folderName);
  }, [folderName, node, t]);

  if (node.kind === 'task' && node.task) {
    return (
      <GraphAnimatedNodeCard
        interactionPhase={interactionPhase}
        color={color}
        dimmed={dimmed}
        active={isActive}
        neighbor={neighbor}
        highlighted={highlighted}
        nodeKind="task"
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <GraphTaskNodeCardContent
          text={node.task.text}
          color={color}
          isDone={node.task.isDone}
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
        active={isActive}
        neighbor={neighbor}
        highlighted={highlighted}
        nodeKind="record"
        accentStripeColor={accentColor}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
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
});

export { GraphNodeCardWrapper };
