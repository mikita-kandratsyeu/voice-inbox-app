import dayjs from 'dayjs';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Flag,
  Inbox,
  ListTodo,
  Tag as TagIcon,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { FolderLucideIcon } from '@/entities/folder/lib/folderLucideIcons';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';

import type { GraphNode } from '../lib/graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from '../lib/graphTypes';
import {
  GRAPH_NODE_INTERACTION_DRAGGING,
  GRAPH_NODE_INTERACTION_PRESSING,
} from './graphNodeInteraction';

const GRAPH_CHIP_ICON_SIZE = 10;
const GRAPH_CHIP_FONT_SIZE = 10;
const GRAPH_CHIP_PAD_X = 6;
const GRAPH_CHIP_PAD_Y = 2;

const GraphNodeLocationChip = React.memo(function GraphNodeLocationChip({
  label,
  color,
  accentColor,
  folderIconId,
  showInboxIcon,
}: {
  label: string;
  color: Colors;
  accentColor?: string;
  folderIconId?: string;
  showInboxIcon?: boolean;
}) {
  const isFolder = Boolean(folderIconId);
  const iconColor = accentColor ?? color.text.secondary;
  const backgroundColor = accentColor ? withAlphaHex(accentColor, 0.14) : color.background.tertiary;

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor,
        borderRadius: 999,
        flexDirection: 'row',
        flexShrink: 1,
        gap: 3,
        maxWidth: '100%',
        paddingHorizontal: GRAPH_CHIP_PAD_X,
        paddingVertical: GRAPH_CHIP_PAD_Y,
        ...(isFolder && accentColor
          ? { borderColor: withAlphaHex(accentColor, 0.28), borderWidth: 1 }
          : null),
      }}
    >
      {folderIconId ? (
        <FolderLucideIcon
          iconId={folderIconId}
          size={GRAPH_CHIP_ICON_SIZE}
          color={iconColor}
          strokeWidth={2.2}
        />
      ) : showInboxIcon ? (
        <Inbox size={GRAPH_CHIP_ICON_SIZE} color={iconColor} strokeWidth={2.2} />
      ) : (
        <TagIcon size={GRAPH_CHIP_ICON_SIZE} color={iconColor} strokeWidth={2.2} />
      )}
      <Text
        numberOfLines={1}
        style={{
          color: isFolder ? color.text.primary : iconColor,
          flexShrink: 1,
          fontSize: GRAPH_CHIP_FONT_SIZE,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
});

const GraphNodeArchivedChip = React.memo(function GraphNodeArchivedChip({
  label,
  color,
}: {
  label: string;
  color: Colors;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: color.accent.archive,
        borderRadius: 999,
        flexDirection: 'row',
        flexShrink: 0,
        gap: 3,
        paddingHorizontal: GRAPH_CHIP_PAD_X,
        paddingVertical: GRAPH_CHIP_PAD_Y,
      }}
    >
      <Archive size={GRAPH_CHIP_ICON_SIZE} color={color.icon.onAccent} strokeWidth={2.2} />
      <Text
        numberOfLines={1}
        style={{ color: color.icon.onAccent, fontSize: GRAPH_CHIP_FONT_SIZE, fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
});

const GraphNodeOpenTasksChip = React.memo(function GraphNodeOpenTasksChip({
  label,
  color,
}: {
  label: string;
  color: Colors;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: color.background.tertiary,
        borderRadius: 999,
        flexDirection: 'row',
        flexShrink: 0,
        gap: 3,
        paddingHorizontal: GRAPH_CHIP_PAD_X,
        paddingVertical: GRAPH_CHIP_PAD_Y,
      }}
    >
      <ListTodo color={color.icon.muted} size={GRAPH_CHIP_ICON_SIZE} strokeWidth={2.2} />
      <Text
        numberOfLines={1}
        style={{ color: color.text.secondary, fontSize: GRAPH_CHIP_FONT_SIZE, fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
});

const GraphNodeTagsRow = React.memo(function GraphNodeTagsRow({
  tags,
  color,
}: {
  tags: string[];
  color: Colors;
}) {
  const { t } = useTranslation();
  if (tags.length === 0) return null;

  const visibleTag = tags[0];
  const hiddenCount = tags.length - 1;

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      <View
        style={{
          backgroundColor: color.status.processing.bg,
          borderRadius: 999,
          paddingHorizontal: GRAPH_CHIP_PAD_X,
          paddingVertical: GRAPH_CHIP_PAD_Y,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: color.status.processing.text,
            fontSize: GRAPH_CHIP_FONT_SIZE,
            fontWeight: '500',
            maxWidth: 72,
          }}
        >
          {visibleTag}
        </Text>
      </View>
      {hiddenCount > 0 ? (
        <View
          style={{
            backgroundColor: color.background.tertiary,
            borderRadius: 999,
            paddingHorizontal: GRAPH_CHIP_PAD_X,
            paddingVertical: GRAPH_CHIP_PAD_Y,
          }}
        >
          <Text
            style={{ color: color.text.muted, fontSize: GRAPH_CHIP_FONT_SIZE, fontWeight: '600' }}
          >
            {t('inbox.cardLayout.moreTags', { count: hiddenCount })}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

type AnimatedNodeCardShellProps = {
  interactionPhase: SharedValue<number>;
  color: Colors;
  dimmed: boolean;
  active: boolean;
  neighbor: boolean;
  highlighted: boolean;
  width: number;
  minHeight: number;
  borderRadius: number;
  backgroundColor: string;
  accentStripeColor?: string;
  onPress?: () => void;
  children: React.ReactNode;
  taskStyle?: boolean;
};

const AnimatedNodeCardShell = React.memo(function AnimatedNodeCardShell({
  interactionPhase,
  color,
  dimmed,
  active,
  neighbor,
  highlighted,
  width,
  minHeight,
  borderRadius,
  backgroundColor,
  accentStripeColor,
  onPress,
  children,
  taskStyle = false,
}: AnimatedNodeCardShellProps) {
  const idleBorderWidth = active ? 2.5 : neighbor ? 2 : highlighted ? 2 : 1;
  const idleOpacity = dimmed ? 0.18 : 1;
  const hasStripe = accentStripeColor != null;
  const selectionAccent = color.accent.primary;
  const neighborBorderColor = useMemo(() => withAlphaHex(selectionAccent, 0.72), [selectionAccent]);
  const selectionGlowBorderColor = useMemo(
    () => withAlphaHex(selectionAccent, 0.48),
    [selectionAccent],
  );
  const selectionGlowBackgroundColor = useMemo(
    () => withAlphaHex(selectionAccent, 0.1),
    [selectionAccent],
  );

  const animatedShellStyle = useAnimatedStyle(() => {
    const phase = Math.round(interactionPhase.value);
    const dragging = phase >= GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const pressing =
      phase >= GRAPH_NODE_INTERACTION_PRESSING && phase < GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const interactive = dragging > 0 || pressing > 0;

    const shouldOverrideDimming = active || neighbor || highlighted;
    const opacity = interactive || shouldOverrideDimming ? 1 : idleOpacity;

    if (dimmed && !interactive) {
      return {
        opacity,
        borderWidth: 1,
        borderColor: color.border.default,
        shadowColor: color.shadow.color,
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      };
    }

    const borderWidth = dragging > 0 ? 2.5 : pressing > 0 ? 2.5 : idleBorderWidth;

    const shadowOpacity = active
      ? dragging
        ? color.shadow.opacity * 2
        : color.shadow.opacity * 2.8
      : dragging
        ? color.shadow.opacity * 2.4
        : pressing
          ? color.shadow.opacity * 1.1
          : taskStyle
            ? color.shadow.opacity * 0.8
            : color.shadow.opacity * 1.1;

    const shadowRadius = active
      ? dragging
        ? 12
        : 14
      : dragging > 0
        ? 10
        : pressing > 0
          ? 6
          : taskStyle
            ? 6
            : 9;
    const elevation = active
      ? dragging
        ? 8
        : 10
      : dragging > 0
        ? 6
        : pressing > 0
          ? 3
          : taskStyle
            ? 2
            : 4;

    return {
      opacity,
      borderWidth,
      borderColor:
        interactive || active
          ? selectionAccent
          : neighbor
            ? neighborBorderColor
            : highlighted
              ? selectionAccent
              : color.border.default,
      shadowColor: active ? selectionAccent : color.shadow.color,
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: 0, height: dragging > 0 ? 4 : active ? 0 : pressing > 0 ? 2 : 3 },
      elevation,
    };
  }, [
    active,
    color.border.default,
    color.shadow.color,
    color.shadow.opacity,
    dimmed,
    highlighted,
    idleBorderWidth,
    idleOpacity,
    neighbor,
    neighborBorderColor,
    selectionAccent,
    taskStyle,
  ]);

  const content = onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
      {children}
    </Pressable>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <View style={{ width, minHeight, overflow: 'visible' }}>
      {active ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            borderRadius: borderRadius + 6,
            borderWidth: 1.5,
            borderColor: selectionGlowBorderColor,
            backgroundColor: selectionGlowBackgroundColor,
          }}
        />
      ) : null}
      <Animated.View
        style={[
          {
            width,
            minHeight,
            borderRadius,
            backgroundColor,
            overflow: 'hidden',
            flexDirection: hasStripe ? 'row' : undefined,
            alignItems: hasStripe ? 'stretch' : undefined,
            paddingHorizontal: hasStripe ? 0 : taskStyle ? 10 : 0,
            paddingVertical: hasStripe ? 0 : taskStyle ? 8 : 0,
          },
          animatedShellStyle,
        ]}
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
          <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 9 }}>{content}</View>
        ) : (
          content
        )}
      </Animated.View>
    </View>
  );
});

export const GraphRecordNodeCardContent = React.memo(function GraphRecordNodeCardContent({
  title,
  folderName,
  archivedLabel,
  openTasksLabel,
  tags,
  accentColor,
  color,
  folderTintHex,
  showInboxIcon,
  leadingFolderIconId,
}: {
  title: string;
  folderName?: string;
  archivedLabel?: string;
  openTasksLabel?: string;
  tags: string[];
  accentColor: string;
  color: Colors;
  folderTintHex?: string;
  showInboxIcon?: boolean;
  leadingFolderIconId?: string | null;
}) {
  const hasMetaChips = Boolean(folderName || archivedLabel || openTasksLabel);
  const hasTags = tags.length > 0;
  const locationAccent = folderTintHex ?? accentColor;

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        numberOfLines={2}
        style={{
          color: color.text.primary,
          fontSize: 12,
          fontWeight: '700',
          lineHeight: 15.6,
          letterSpacing: -0.1,
        }}
      >
        {title}
      </Text>
      {hasMetaChips ? (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 4,
          }}
        >
          {archivedLabel ? <GraphNodeArchivedChip label={archivedLabel} color={color} /> : null}
          {folderName ? (
            <GraphNodeLocationChip
              label={folderName}
              color={color}
              accentColor={locationAccent}
              folderIconId={leadingFolderIconId ?? undefined}
              showInboxIcon={showInboxIcon}
            />
          ) : null}
          {openTasksLabel ? <GraphNodeOpenTasksChip label={openTasksLabel} color={color} /> : null}
        </View>
      ) : null}
      {hasTags ? (
        <View style={{ marginTop: 4 }}>
          <GraphNodeTagsRow tags={tags} color={color} />
        </View>
      ) : null}
    </View>
  );
});

const GraphTaskMetaChip = React.memo(function GraphTaskMetaChip({
  color,
  icon,
  label,
  labelColor,
}: {
  color: Colors;
  icon: React.ReactNode;
  label: string;
  labelColor: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 5,
        backgroundColor: color.background.secondary,
        flexShrink: 0,
        gap: 3,
        paddingHorizontal: 5,
        paddingVertical: 2,
      }}
    >
      {icon}
      <Text style={{ color: labelColor, fontSize: 9, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

export const GraphTaskNodeCardContent = React.memo(function GraphTaskNodeCardContent({
  text,
  color,
  isDone = false,
  priority,
  deadline,
  deadlineTime,
}: {
  text: string;
  color: Colors;
  isDone?: boolean;
  priority?: 'high' | 'medium' | 'low';
  deadline?: string | null;
  deadlineTime?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const parsedDeadline = parseTaskDeadline(deadline);
  const deadlineText =
    !isDone && parsedDeadline !== null
      ? `${dayjs(parsedDeadline).locale(resolveDayjsLocale(i18n.language)).format('D MMM')}${
          deadlineTime ? `, ${formatTaskDeadlineTimeForDisplay(deadlineTime)}` : ''
        }`
      : null;
  const isOverdue =
    !isDone && parsedDeadline !== null && dayjs(parsedDeadline).isBefore(dayjs(), 'day');
  const priorityColor =
    priority === 'high'
      ? color.accent.delete
      : priority === 'medium'
        ? color.accent.cache
        : color.text.secondary;
  const hasMeta = Boolean(isDone || deadlineText || priority);

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        numberOfLines={2}
        style={{
          color: isDone ? color.text.secondary : color.text.primary,
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 14.3,
          letterSpacing: -0.08,
          textDecorationLine: isDone ? 'line-through' : undefined,
        }}
      >
        {text}
      </Text>
      {hasMeta ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 3,
          }}
        >
          {isDone ? (
            <GraphTaskMetaChip
              color={color}
              icon={<CheckCircle2 size={9} color={color.accent.success} strokeWidth={2} />}
              label={t('allTasks.sections.done')}
              labelColor={color.accent.success}
            />
          ) : null}
          {deadlineText ? (
            <GraphTaskMetaChip
              color={color}
              icon={
                <CalendarDays
                  size={9}
                  color={isOverdue ? color.accent.delete : color.icon.muted}
                  strokeWidth={2}
                />
              }
              label={deadlineText}
              labelColor={isOverdue ? color.accent.delete : color.text.secondary}
            />
          ) : null}
          {!isDone && priority ? (
            <GraphTaskMetaChip
              color={color}
              icon={<Flag size={9} color={priorityColor} strokeWidth={2} />}
              label={t(`tasks.priority.${priority}`)}
              labelColor={priorityColor}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export const GraphAnimatedNodeCard = React.memo(function GraphAnimatedNodeCard({
  interactionPhase,
  color,
  dimmed,
  active,
  neighbor,
  highlighted,
  nodeKind,
  accentStripeColor,
  onPress,
  children,
}: {
  interactionPhase: SharedValue<number>;
  color: Colors;
  dimmed: boolean;
  active: boolean;
  neighbor: boolean;
  highlighted: boolean;
  nodeKind: GraphNode['kind'];
  accentStripeColor?: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const isTask = nodeKind === 'task';
  const width = isTask ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;
  const minHeight = isTask ? TASK_NODE_HEIGHT : RECORD_NODE_HEIGHT;

  return (
    <AnimatedNodeCardShell
      interactionPhase={interactionPhase}
      color={color}
      dimmed={dimmed}
      active={active}
      neighbor={neighbor}
      highlighted={highlighted}
      width={width}
      minHeight={minHeight}
      borderRadius={isTask ? 10 : 13}
      backgroundColor={isTask ? withAlphaHex(color.background.card, 0.97) : color.background.card}
      accentStripeColor={isTask ? undefined : accentStripeColor}
      onPress={onPress}
      taskStyle={isTask}
    >
      {children}
    </AnimatedNodeCardShell>
  );
});

export function useGraphNodeWrapperStyle(
  node: GraphNode,
  interactionPhase: SharedValue<number>,
): ReturnType<typeof useAnimatedStyle> {
  const width = node.kind === 'task' ? TASK_NODE_WIDTH : RECORD_NODE_WIDTH;

  return useAnimatedStyle(() => ({
    position: 'absolute',
    left: node.x,
    top: node.y,
    width,
    zIndex:
      interactionPhase.value >= GRAPH_NODE_INTERACTION_DRAGGING
        ? 20
        : interactionPhase.value >= GRAPH_NODE_INTERACTION_PRESSING
          ? 10
          : 0,
  }));
}

export function GraphNodeCardWrapper({
  node,
  interactionPhase,
  children,
}: {
  node: GraphNode;
  interactionPhase: SharedValue<number>;
  children: React.ReactNode;
}) {
  const wrapperStyle = useGraphNodeWrapperStyle(node, interactionPhase);

  return <Animated.View style={wrapperStyle}>{children}</Animated.View>;
}
