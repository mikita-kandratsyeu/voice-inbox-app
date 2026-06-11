import dayjs from 'dayjs';
import {
  Archive,
  CalendarDays,
  Flag,
  Inbox,
  ListChecks,
  Tag as TagIcon,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

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

function GraphNodeLocationChip({
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
}

function GraphNodeArchivedChip({ label, color }: { label: string; color: Colors }) {
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
}

function GraphNodeOpenTasksChip({ label, color }: { label: string; color: Colors }) {
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
      <ListChecks color={color.icon.muted} size={GRAPH_CHIP_ICON_SIZE} strokeWidth={2.2} />
      <Text
        numberOfLines={1}
        style={{ color: color.text.secondary, fontSize: GRAPH_CHIP_FONT_SIZE, fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
}

function GraphNodeTagsRow({ tags, color }: { tags: string[]; color: Colors }) {
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
}

type AnimatedNodeCardShellProps = {
  interactionPhase: SharedValue<number>;
  color: Colors;
  dimmed: boolean;
  active: boolean;
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

function AnimatedNodeCardShell({
  interactionPhase,
  color,
  dimmed,
  active,
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
  const idleBorderWidth = active ? 2.5 : highlighted ? 2 : 1;
  const idleOpacity = dimmed ? 0.32 : 1;
  const hasStripe = accentStripeColor != null;

  const animatedShellStyle = useAnimatedStyle(() => {
    const phase = interactionPhase.value;
    const dragging = phase >= GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const pressing =
      phase >= GRAPH_NODE_INTERACTION_PRESSING && phase < GRAPH_NODE_INTERACTION_DRAGGING ? 1 : 0;
    const interactive = dragging > 0 || pressing > 0;

    // When active or highlighted, always show full opacity even if dimmed
    const shouldOverrideDimming = active || highlighted;
    const opacity = shouldOverrideDimming
      ? 1
      : dimmed
        ? interpolate(phase, [0, 1, 2], [idleOpacity, 0.5, 1])
        : idleOpacity;

    const borderWidth = dragging > 0 ? 2.5 : pressing > 0 ? 2 : idleBorderWidth;

    const shadowOpacity = dragging
      ? color.shadow.opacity * 3.2
      : pressing
        ? color.shadow.opacity * 1.2
        : taskStyle
          ? color.shadow.opacity * 0.8
          : color.shadow.opacity * 1.1;

    const shadowRadius = dragging > 0 ? 14 : pressing > 0 ? 8 : taskStyle ? 6 : 9;
    const elevation = dragging > 0 ? 8 : pressing > 0 ? 4 : taskStyle ? 2 : 4;

    const scale = dragging > 0 ? 1.05 : pressing > 0 ? 0.98 : 1;

    return {
      opacity,
      borderWidth,
      borderColor: interactive
        ? color.accent.primary
        : active || highlighted
          ? color.accent.primary
          : color.border.default,
      shadowColor: color.shadow.color,
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: 0, height: dragging > 0 ? 6 : pressing > 0 ? 1 : 3 },
      elevation,
      transform: [{ scale }],
    };
  }, [
    active,
    highlighted,
    color.accent.primary,
    color.border.default,
    color.shadow.color,
    color.shadow.opacity,
    dimmed,
    idleBorderWidth,
    idleOpacity,
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
  );
}

export function GraphRecordNodeCardContent({
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
          {archivedLabel ? (
            <GraphNodeArchivedChip label={archivedLabel} color={color} />
          ) : null}
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
}

function GraphTaskMetaChip({
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
}

export function GraphTaskNodeCardContent({
  text,
  color,
  priority,
  deadline,
  deadlineTime,
}: {
  text: string;
  color: Colors;
  priority?: 'high' | 'medium' | 'low';
  deadline?: string | null;
  deadlineTime?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const parsedDeadline = parseTaskDeadline(deadline);
  const deadlineText =
    parsedDeadline !== null
      ? `${dayjs(parsedDeadline).locale(resolveDayjsLocale(i18n.language)).format('D MMM')}${
          deadlineTime ? `, ${formatTaskDeadlineTimeForDisplay(deadlineTime)}` : ''
        }`
      : null;
  const isOverdue = parsedDeadline !== null && dayjs(parsedDeadline).isBefore(dayjs(), 'day');
  const priorityColor =
    priority === 'high'
      ? color.accent.delete
      : priority === 'medium'
        ? color.accent.cache
        : color.text.secondary;
  const hasMeta = Boolean(deadlineText || priority);

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        numberOfLines={2}
        style={{
          color: color.text.primary,
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 14.3,
          letterSpacing: -0.08,
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
          {priority ? (
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
}

export function GraphAnimatedNodeCard({
  interactionPhase,
  color,
  dimmed,
  active,
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
}

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
