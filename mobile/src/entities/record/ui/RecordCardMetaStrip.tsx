import { Check, Clock, FileText, ListChecks } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

/** Below this width, the strip uses shorter labels and tighter spacing. */
const COMPACT_LAYOUT_MAX_WIDTH = 420;
/** Below this width, stat labels are hidden to save horizontal space. */
const DENSE_LAYOUT_MAX_WIDTH = 380;

type RecordCardMetaStripProps = {
  noteKind: RecordCardNoteKind;
  duration: string;
  color: Colors;
  textFragmentCount?: number;
  tasks?: TaskItem[];
};

type IconBadgeTone = 'info' | 'success' | 'neutral';
type LayoutDensity = 'regular' | 'compact' | 'dense';

function MetaStripDivider({ color, dense }: { color: Colors; dense: boolean }) {
  return (
    <View
      style={{
        width: 1,
        alignSelf: 'stretch',
        marginVertical: dense ? 2 : 4,
        backgroundColor: color.border.default,
      }}
    />
  );
}

function MetaIconBadge({
  color,
  tone,
  children,
  size = 32,
}: {
  color: Colors;
  tone: IconBadgeTone;
  children: React.ReactNode;
  size?: number;
}) {
  const backgroundColor =
    tone === 'info'
      ? color.status.processing.bg
      : tone === 'success'
        ? withAlphaHex(color.accent.success, 0.16)
        : color.background.tertiary;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        flexShrink: 0,
      }}
    >
      {children}
    </View>
  );
}

function MetaStat({
  color,
  icon,
  value,
  label,
  accessibilityLabel,
  density,
}: {
  color: Colors;
  icon: React.ReactNode;
  value: string;
  label?: string;
  accessibilityLabel: string;
  density: LayoutDensity;
}) {
  const dense = density === 'dense';
  const compact = density !== 'regular';
  const iconSize = dense ? 26 : compact ? 28 : 32;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: dense ? 6 : compact ? 8 : 10,
        flexShrink: 0,
      }}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <MetaIconBadge color={color} tone="info" size={iconSize}>
        {icon}
      </MetaIconBadge>
      <View style={{ flexShrink: 0 }}>
        <Text
          style={{
            fontSize: dense ? 14 : compact ? 15 : 17,
            fontWeight: '700',
            color: color.text.primary,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {label ? (
          <Text
            style={{
              fontSize: dense ? 10 : 11,
              lineHeight: dense ? 12 : 14,
              color: color.text.muted,
              marginTop: dense ? 1 : 2,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TasksMetaStat({
  color,
  doneCount,
  totalCount,
  allTasksDone,
  label,
  accessibilityLabel,
  density,
}: {
  color: Colors;
  doneCount: number;
  totalCount: number;
  allTasksDone: boolean;
  label?: string;
  accessibilityLabel: string;
  density: LayoutDensity;
}) {
  const dense = density === 'dense';
  const compact = density !== 'regular';
  const iconSize = dense ? 26 : compact ? 28 : 32;
  const tone: IconBadgeTone = allTasksDone ? 'success' : 'neutral';
  const iconColor = allTasksDone ? color.accent.success : color.icon.muted;
  const iconPx = dense ? 13 : compact ? 14 : 15;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: dense ? 6 : compact ? 8 : 10,
        flexShrink: 0,
      }}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <MetaIconBadge color={color} tone={tone} size={iconSize}>
        {allTasksDone ? (
          <Check size={iconPx} color={iconColor} strokeWidth={2.5} />
        ) : (
          <ListChecks size={iconPx} color={iconColor} strokeWidth={2} />
        )}
      </MetaIconBadge>
      <View style={{ flexShrink: 0 }}>
        <Text
          style={{
            fontSize: dense ? 14 : compact ? 15 : 17,
            fontWeight: '700',
            color: color.text.primary,
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {`${doneCount}/${totalCount}`}
        </Text>
        {label ? (
          <Text
            style={{
              fontSize: dense ? 10 : 11,
              lineHeight: dense ? 12 : 14,
              color: color.text.muted,
              marginTop: dense ? 1 : 2,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const RecordCardMetaStrip = memo(function RecordCardMetaStrip({
  noteKind,
  duration,
  color,
  textFragmentCount = 0,
  tasks = [],
}: RecordCardMetaStripProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  const hasTasks = tasks.length > 0;
  const doneCount = tasks.filter((task) => task.isDone).length;
  const allTasksDone = hasTasks && doneCount === tasks.length;
  const showDuration = noteKind !== 'text';
  const showTextFragments = noteKind === 'text' && textFragmentCount > 0;

  if (!showDuration && !showTextFragments && !hasTasks) {
    return null;
  }

  const density: LayoutDensity =
    windowWidth < DENSE_LAYOUT_MAX_WIDTH
      ? 'dense'
      : windowWidth < COMPACT_LAYOUT_MAX_WIDTH
        ? 'compact'
        : 'regular';
  const compact = density !== 'regular';
  const dense = density === 'dense';

  const durationLabel = dense
    ? undefined
    : compact
      ? t('inbox.cardLayout.recordingDurationShort')
      : t('inbox.cardLayout.recordingDuration');
  const tasksLabel = dense
    ? undefined
    : compact
      ? t('inbox.cardLayout.tasksCompletedShort')
      : t('inbox.cardLayout.tasksCompletedLabel');

  const statSegments: Array<{ key: string; node: React.ReactNode }> = [];

  if (showDuration) {
    statSegments.push({
      key: 'duration',
      node: (
        <MetaStat
          color={color}
          density={density}
          icon={
            <Clock
              size={dense ? 13 : compact ? 14 : 15}
              color={color.status.processing.text}
              strokeWidth={2}
            />
          }
          value={duration}
          label={durationLabel}
          accessibilityLabel={`${duration}, ${t('inbox.cardLayout.recordingDuration')}`}
        />
      ),
    });
  }

  if (showTextFragments) {
    statSegments.push({
      key: 'fragments',
      node: (
        <MetaStat
          color={color}
          density={density}
          icon={
            <FileText
              size={dense ? 13 : compact ? 14 : 15}
              color={color.status.processing.text}
              strokeWidth={2}
            />
          }
          value={String(textFragmentCount)}
          label={
            dense ? undefined : t('inbox.cardLayout.textFragments', { count: textFragmentCount })
          }
          accessibilityLabel={t('inbox.cardLayout.textFragments', { count: textFragmentCount })}
        />
      ),
    });
  }

  if (hasTasks) {
    statSegments.push({
      key: 'tasks',
      node: (
        <TasksMetaStat
          color={color}
          density={density}
          doneCount={doneCount}
          totalCount={tasks.length}
          allTasksDone={allTasksDone}
          label={tasksLabel}
          accessibilityLabel={`${doneCount}/${tasks.length}, ${t('inbox.cardLayout.tasksCompletedLabel')}`}
        />
      ),
    });
  }

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: dense ? 8 : compact ? 10 : 12,
        marginTop: 14,
        paddingHorizontal: dense ? 10 : compact ? 12 : 14,
        paddingVertical: dense ? 8 : compact ? 10 : 12,
        borderRadius: 12,
        backgroundColor: color.background.card,
      }}
      accessibilityRole="text"
    >
      {statSegments.map((segment, index) => (
        <React.Fragment key={segment.key}>
          {index > 0 ? <MetaStripDivider color={color} dense={dense} /> : null}
          {segment.node}
        </React.Fragment>
      ))}
    </View>
  );
});
