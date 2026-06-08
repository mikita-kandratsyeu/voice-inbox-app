import { CheckCircle2, Clock, FileText, ListChecks } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

type RecordCardMetaStripProps = {
  noteKind: RecordCardNoteKind;
  duration: string;
  color: Colors;
  hasTranscript: boolean;
  hasSummary: boolean;
  textFragmentCount?: number;
  tasks?: TaskItem[];
};

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

  const hasTasks = tasks.length > 0;
  const doneCount = tasks.filter((task) => task.isDone).length;
  const allTasksDone = hasTasks && doneCount === tasks.length;
  const showDuration = noteKind !== 'text';
  const showTextFragments = noteKind === 'text' && textFragmentCount > 0;

  const detailChips: string[] = [];
  if (noteKind !== 'text') {
    if (hasTranscript) {
      detailChips.push(t('inbox.cardLayout.sourceText'));
    } else if (hasSummary) {
      detailChips.push(t('inbox.cardLayout.hasSummary'));
    }
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: color.background.tertiary,
      }}
      accessibilityRole="text"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          flexShrink: 1,
        }}
      >
        {showDuration ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={color.icon.muted} strokeWidth={2} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}>
              {duration}
            </Text>
          </View>
        ) : null}

        {showTextFragments ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FileText size={14} color={color.icon.muted} strokeWidth={2} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: color.text.secondary }}>
              {t('inbox.cardLayout.textFragments', { count: textFragmentCount })}
            </Text>
          </View>
        ) : null}

        {hasTasks ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {allTasksDone ? (
              <CheckCircle2 size={14} color={color.accent.success} strokeWidth={2} />
            ) : (
              <ListChecks size={14} color={color.icon.muted} strokeWidth={2} />
            )}
            <Text style={{ fontSize: 13, fontWeight: '500', color: color.text.secondary }}>
              {t('inbox.cardLayout.tasksProgress', { done: doneCount, total: tasks.length })}
            </Text>
          </View>
        ) : null}
      </View>

      {detailChips.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <FileText size={14} color={color.text.muted} strokeWidth={2} />
          <Text
            style={{ fontSize: 13, fontWeight: '500', color: color.text.muted }}
            numberOfLines={1}
          >
            {detailChips.join(' · ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
