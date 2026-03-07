import { Clock, Pin } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { Tag } from '@/shared/ui';

import { AiStatusPill } from './AiStatusPill';

type RecordCardProps = {
  item: VoiceRecord;
  color: Colors;
  onPress: () => void;
  onStatusPress: () => void;
};

export const RecordCard = ({ item, color, onPress, onStatusPress }: RecordCardProps) => {
  const cardStyle = {
    shadowColor: color.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: color.shadow.opacity,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: color.background.card,
  };
  const pinIconStyle = { marginRight: 6 };
  const textPrimaryStyle = { color: color.text.primary };
  const textSecondaryStyle = { color: color.text.secondary };

  const hasTags = item.tags && item.tags.length > 0;
  const showBottomRow = hasTags || !!item.aiStatus;

  return (
    <TouchableOpacity
      className="rounded-2xl p-4"
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View className="mb-1 flex-row items-start justify-between">
        <View className="mr-2 flex-1 flex-row items-center">
          {item.isPinned ? (
            <Pin size={14} color={color.accent.pin} strokeWidth={2} style={pinIconStyle} />
          ) : null}
          <Text
            className="flex-1 text-base font-semibold"
            style={textPrimaryStyle}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row items-center">
        <Clock size={14} color={color.icon.muted} strokeWidth={2} />
        <Text className="ml-1 text-xs" style={textSecondaryStyle}>
          {item.duration}
          {'  '}
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      {Boolean(item.transcript) && (
        <Text className="mb-3 text-sm leading-5" style={textSecondaryStyle} numberOfLines={2}>
          {item.transcript}
        </Text>
      )}
      {showBottomRow && (
        <View className="flex-row items-center justify-between">
          <View className="flex-row flex-wrap gap-y-1">
            {hasTags ? item.tags!.map((tag) => <Tag key={tag} label={tag} />) : null}
          </View>
          {item.aiStatus ? <AiStatusPill aiStatus={item.aiStatus} onPress={onStatusPress} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};
