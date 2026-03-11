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
  const { i18n } = useTranslation();
  return (
    <View className="gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <Text
        className="text-xl font-bold tracking-tight"
        style={{ color: color.text.primary }}
        numberOfLines={2}
      >
        {record.title}
      </Text>

      {record.tags && record.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {record.tags.map((tag) => (
            <RecordDetailTag key={tag} label={tag} color={color} />
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
