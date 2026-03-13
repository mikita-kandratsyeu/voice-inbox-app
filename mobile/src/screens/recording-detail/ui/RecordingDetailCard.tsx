import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';

import { RecordDetailTag } from './RecordDetailTag';

type RecordingDetailCardProps = {
  record: VoiceRecord;
  color: Colors;
};

export const RecordingDetailCard = ({ record, color }: RecordingDetailCardProps) => {
  const { t, i18n } = useTranslation();
  const dateStr = record.createdAt ? formatRelativeTime(record.createdAt, i18n.language) : '';
  const tagsStr = record.tags && record.tags.length > 0 ? record.tags.join(', ') : '';
  const baseLabel = t('recordingDetail.accessibility.cardLabel', {
    title: record.title,
    date: dateStr,
    duration: record.duration,
  });
  const accessibilityLabel = tagsStr
    ? baseLabel + t('recordingDetail.accessibility.tagsSuffix', { tags: tagsStr })
    : baseLabel;

  return (
    <View
      className="gap-2 rounded-2xl p-4"
      style={{ backgroundColor: color.background.card }}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text
          className="flex-1 text-xl font-bold tracking-tight min-w-0"
          style={{ color: color.text.primary }}
          numberOfLines={2}
        >
          {record.title}
        </Text>
        {record.status === 'archived' && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: color.accent.archive,
            }}
          >
            <Text style={{ fontSize: 12, color: color.icon.onAccent, fontWeight: '500' }}>
              {t('inbox.filters.archived')}
            </Text>
          </View>
        )}
        {record.classification && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: color.background.tertiary,
            }}
          >
            <Text style={{ fontSize: 12, color: color.text.secondary }}>
              {t(`classification.${record.classification}`)}
            </Text>
          </View>
        )}
      </View>

      {record.tags && record.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {record.tags.map((tag) => (
            <RecordDetailTag key={tag} label={tag} />
          ))}
        </View>
      )}
      {record.createdAt && (
        <Text className="mt-0.5 text-xs" style={{ color: color.text.secondary }}>
          {formatRelativeTime(record.createdAt, i18n.language)}
        </Text>
      )}
    </View>
  );
};
