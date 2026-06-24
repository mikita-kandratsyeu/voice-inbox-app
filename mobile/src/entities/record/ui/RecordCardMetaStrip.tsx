import { Check, Clock, FileText, Link2, ListTodo, UsersRound } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import { shouldRenderRecordCardMetaStrip } from '@/entities/record/lib/recordCardExpandedPreview';
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
  meetingParticipantCount?: number;
  linkNeighborCount?: number;
};

type IconBadgeTone = 'info' | 'success' | 'neutral' | 'transcript' | 'link';
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
        : tone === 'transcript'
          ? withAlphaHex(color.accent.transcript, 0.16)
          : tone === 'link'
            ? withAlphaHex(color.accent.primary, 0.16)
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
  iconBadgeTone = 'info',
}: {
  color: Colors;
  icon: React.ReactNode;
  value: string;
  label?: string;
  accessibilityLabel: string;
  density: LayoutDensity;
  iconBadgeTone?: IconBadgeTone;
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
      <MetaIconBadge color={color} tone={iconBadgeTone} size={iconSize}>
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
          <ListTodo size={iconPx} color={iconColor} strokeWidth={2} />
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
  meetingParticipantCount = 0,
  linkNeighborCount = 0,
}: RecordCardMetaStripProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  const hasTasks = tasks.length > 0;
  const doneCount = tasks.filter((task) => task.isDone).length;
  const allTasksDone = hasTasks && doneCount === tasks.length;

  if (
    !shouldRenderRecordCardMetaStrip({
      noteKind,
      textFragmentCount,
      tasks,
      meetingParticipantCount,
      linkNeighborCount,
    })
  ) {
    return null;
  }

  const showDuration = noteKind !== 'text';
  const showTextFragments = noteKind === 'text' && textFragmentCount > 0;
  const showMeetingParticipants = meetingParticipantCount > 0;
  const showLinkedNotes = linkNeighborCount > 0;

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
  const meetingParticipantsLabel = dense
    ? undefined
    : compact
      ? t('inbox.cardLayout.meetingParticipantsShort')
      : t('inbox.cardLayout.meetingParticipantsLabel');
  const textFragmentsLabel = dense ? undefined : t('inbox.cardLayout.textFragmentsShort');
  const linkedNotesLabel = dense
    ? undefined
    : compact
      ? t('inbox.cardLayout.linkedNotesShort')
      : t('inbox.cardLayout.linkedNotesLabel');

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
          label={textFragmentsLabel}
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

  if (showMeetingParticipants) {
    statSegments.push({
      key: 'participants',
      node: (
        <MetaStat
          color={color}
          density={density}
          iconBadgeTone="transcript"
          icon={
            <UsersRound
              size={dense ? 13 : compact ? 14 : 15}
              color={color.accent.transcript}
              strokeWidth={2}
            />
          }
          value={String(meetingParticipantCount)}
          label={meetingParticipantsLabel}
          accessibilityLabel={t('inbox.cardLayout.meetingParticipants', {
            count: meetingParticipantCount,
          })}
        />
      ),
    });
  }

  if (showLinkedNotes) {
    statSegments.push({
      key: 'links',
      node: (
        <MetaStat
          color={color}
          density={density}
          iconBadgeTone="link"
          icon={
            <Link2
              size={dense ? 13 : compact ? 14 : 15}
              color={color.accent.primary}
              strokeWidth={2}
            />
          }
          value={String(linkNeighborCount)}
          label={linkedNotesLabel}
          accessibilityLabel={t('inbox.cardLayout.linkedNotes', { count: linkNeighborCount })}
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
        paddingLeft: 0,
        paddingRight: dense ? 10 : compact ? 12 : 14,
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
