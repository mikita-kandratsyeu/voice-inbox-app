import { CheckCircle2, Clock, FileText, ListChecks } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

/** Below this width, stats and transcript chip stack vertically. */
const COMPACT_LAYOUT_MAX_WIDTH = 420;

type RecordCardMetaStripProps = {
  noteKind: RecordCardNoteKind;
  duration: string;
  color: Colors;
  hasTranscript: boolean;
  hasSummary: boolean;
  textFragmentCount?: number;
  tasks?: TaskItem[];
};

function MetaStat({
  color,
  icon,
  value,
  label,
}: {
  color: Colors;
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={{ alignItems: 'flex-start', flexShrink: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: color.text.primary }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          lineHeight: 14,
          color: color.text.muted,
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function TranscriptChip({
  color,
  label,
  compact,
}: {
  color: Colors;
  label: string;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 7 : 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
        alignSelf: compact ? 'flex-start' : undefined,
        flexShrink: 0,
      }}
    >
      <FileText size={14} color={color.text.secondary} strokeWidth={2} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export const RecordCardMetaStrip = memo(function RecordCardMetaStrip({
  noteKind,
  duration,
  color,
  hasTranscript,
  hasSummary,
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
  const showSourceChip =
    noteKind === 'text'
      ? hasTranscript || hasSummary
      : hasTranscript || (!hasTranscript && hasSummary);

  if (!showDuration && !showTextFragments && !hasTasks && !showSourceChip) {
    return null;
  }

  const compact = windowWidth < COMPACT_LAYOUT_MAX_WIDTH;
  const stackSourceChip = compact && showSourceChip;
  const sourceChipLabel =
    noteKind === 'text'
      ? t('inbox.cardLayout.noteTypeText')
      : hasTranscript
        ? t('inbox.cardLayout.sourceText')
        : t('inbox.cardLayout.hasSummary');

  const stats = (
    <>
      {showDuration ? (
        <MetaStat
          color={color}
          icon={<Clock size={15} color={color.icon.muted} strokeWidth={2} />}
          value={duration}
          label={t('inbox.cardLayout.recordingDuration')}
        />
      ) : null}

      {showTextFragments ? (
        <MetaStat
          color={color}
          icon={<FileText size={15} color={color.icon.muted} strokeWidth={2} />}
          value={String(textFragmentCount)}
          label={t('inbox.cardLayout.textFragments', { count: textFragmentCount })}
        />
      ) : null}

      {hasTasks ? (
        <MetaStat
          color={color}
          icon={
            allTasksDone ? (
              <CheckCircle2 size={15} color={color.accent.success} strokeWidth={2} />
            ) : (
              <ListChecks size={15} color={color.icon.muted} strokeWidth={2} />
            )
          }
          value={`${doneCount}/${tasks.length}`}
          label={t('inbox.cardLayout.tasksCompletedLabel')}
        />
      ) : null}
    </>
  );

  const sourceChipButton = showSourceChip ? (
    <TranscriptChip color={color} label={sourceChipLabel} compact={stackSourceChip} />
  ) : null;

  return (
    <View
      style={{
        flexDirection: stackSourceChip ? 'column' : 'row',
        alignItems: stackSourceChip ? 'stretch' : 'center',
        justifyContent: 'flex-start',
        gap: stackSourceChip ? 10 : 20,
        marginTop: 14,
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 10 : 12,
        borderRadius: 12,
        backgroundColor: color.background.tertiary,
      }}
      accessibilityRole="text"
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: compact ? 'wrap' : 'nowrap',
          alignItems: 'flex-start',
          gap: compact ? 12 : 20,
          flex: stackSourceChip ? undefined : 1,
          minWidth: 0,
        }}
      >
        {stats}
      </View>

      {sourceChipButton ? (
        <View style={stackSourceChip ? undefined : { flexShrink: 0, marginLeft: 'auto' }}>
          {sourceChipButton}
        </View>
      ) : null}
    </View>
  );
});
