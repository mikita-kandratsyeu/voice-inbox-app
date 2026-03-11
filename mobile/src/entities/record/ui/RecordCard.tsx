import { Clock, Pin } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { SwipeableCardContext, Tag } from '@/shared/ui';

import { AiStatusPill } from './AiStatusPill';

type RecordCardProps = {
  item: VoiceRecord;
  color: Colors;
  onPress: () => void;
  onStatusPress: () => void;
};

export const RecordCard = ({ item, color, onPress, onStatusPress }: RecordCardProps) => {
  useTranslation();
  const { isSwiping } = React.useContext(SwipeableCardContext);
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
    <Pressable
      style={({ pressed }) => [
        cardStyle,
        { borderRadius: 16, padding: 16, opacity: pressed && !isSwiping ? 0.75 : 1 },
      ]}
      onPress={isSwiping ? undefined : onPress}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          {item.isPinned ? (
            <Pin size={14} color={color.accent.pin} strokeWidth={2} style={pinIconStyle} />
          ) : null}
          <Text
            style={[textPrimaryStyle, { flex: 1, fontSize: 15, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Clock size={14} color={color.icon.muted} strokeWidth={2} />
        <Text style={[textSecondaryStyle, { marginLeft: 4, fontSize: 12 }]}>
          {item.duration}
          {'  '}
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      {Boolean(item.transcript) && (
        <Text
          style={[textSecondaryStyle, { fontSize: 14, lineHeight: 20, marginBottom: 12 }]}
          numberOfLines={2}
        >
          {item.transcript}
        </Text>
      )}
      {showBottomRow && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {hasTags ? item.tags!.map((tag) => <Tag key={tag} label={tag} />) : null}
          </View>
          {item.aiStatus ? <AiStatusPill aiStatus={item.aiStatus} onPress={onStatusPress} /> : null}
        </View>
      )}
    </Pressable>
  );
};
