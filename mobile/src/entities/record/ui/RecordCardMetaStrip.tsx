import { CheckCircle2, Clock, FileText, ListChecks } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, useWindowDimensions, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

/** Below this width, the strip uses a single dense toolbar row. */
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

function MetaStripDivider({ color }: { color: Colors }) {
  return (
    <View
      style={{
        width: 1,
        alignSelf: 'stretch',
        marginVertical: 2,
        backgroundColor: color.border.default,
      }}
    />
  );
}

function MetaStat({
  color,
  icon,
  value,
  label,
}: {
  color: Colors;
  icon: React.ReactNode;
  value: string;
  label?: string;
}) {
  return (
    <View style={{ alignItems: 'flex-start', flexShrink: 0 }} accessibilityRole="text">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: color.text.primary }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {label && (
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
      )}
    </View>
  );
}

function CompactStatCell({
  color,
  icon,
  value,
  label,
  accessibilityLabel,
}: {
  color: Colors;
  icon: React.ReactNode;
  value: string;
  label?: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
        flexShrink: 0,
      }}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: color.text.primary }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {label && (
          <Text
            style={{
              fontSize: 10,
              lineHeight: 13,
              fontWeight: '500',
              color: color.text.muted,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

function CompactSourceCell({ color, label }: { color: Colors; label?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
      }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <FileText size={14} color={color.text.secondary} strokeWidth={2} />
      {label && (
        <Text
          style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
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
  const sourceChipLabel =
    noteKind === 'text'
      ? t('inbox.cardLayout.noteTypeText')
      : hasTranscript
        ? t('inbox.cardLayout.sourceText')
        : t('inbox.cardLayout.hasSummary');

  if (compact) {
    const statSegments: Array<{ key: string; node: React.ReactNode }> = [];

    if (showDuration) {
      statSegments.push({
        key: 'duration',
        node: (
          <CompactStatCell
            color={color}
            icon={<Clock size={14} color={color.icon.muted} strokeWidth={2} />}
            value={duration}
            accessibilityLabel={`${duration}, ${t('inbox.cardLayout.recordingDuration')}`}
          />
        ),
      });
    }

    if (showTextFragments) {
      statSegments.push({
        key: 'fragments',
        node: (
          <CompactStatCell
            color={color}
            icon={<FileText size={14} color={color.icon.muted} strokeWidth={2} />}
            value={String(textFragmentCount)}
            accessibilityLabel={t('inbox.cardLayout.textFragments', { count: textFragmentCount })}
          />
        ),
      });
    }

    if (hasTasks) {
      statSegments.push({
        key: 'tasks',
        node: (
          <CompactStatCell
            color={color}
            icon={
              allTasksDone ? (
                <CheckCircle2 size={14} color={color.accent.success} strokeWidth={2} />
              ) : (
                <ListChecks size={14} color={color.icon.muted} strokeWidth={2} />
              )
            }
            value={`${doneCount}/${tasks.length}`}
            accessibilityLabel={`${doneCount}/${tasks.length}, ${t('inbox.cardLayout.tasksCompletedLabel')}`}
          />
        ),
      });
    }

    const hasStatSegments = statSegments.length > 0;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 14,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: color.background.tertiary,
        }}
        accessibilityRole="text"
      >
        {hasStatSegments ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 1,
              minWidth: 0,
              gap: 4,
            }}
          >
            {statSegments.map((segment, index) => (
              <React.Fragment key={segment.key}>
                {index > 0 ? <MetaStripDivider color={color} /> : null}
                {segment.node}
              </React.Fragment>
            ))}
          </View>
        ) : null}

        {showSourceChip ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 0,
              marginLeft: 'auto',
              gap: 4,
            }}
          >
            {hasStatSegments ? <MetaStripDivider color={color} /> : null}
            <CompactSourceCell color={color} label={sourceChipLabel} />
          </View>
        ) : null}
      </View>
    );
  }

  const sourceChipButton = showSourceChip ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
        flexShrink: 0,
      }}
    >
      <FileText size={14} color={color.text.secondary} strokeWidth={2} />
      <Text
        style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}
        numberOfLines={1}
      >
        {sourceChipLabel}
      </Text>
    </View>
  ) : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 20,
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: color.background.tertiary,
      }}
      accessibilityRole="text"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 20,
          flex: 1,
          minWidth: 0,
        }}
      >
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
      </View>

      {sourceChipButton ? (
        <View style={{ flexShrink: 0, marginLeft: 'auto' }}>{sourceChipButton}</View>
      ) : null}
    </View>
  );
});
