import { CheckCircle, Clock, Pin } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, SectionList, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { type Colors, getColors } from '@/shared/config';
import { EmptyState, SwipeableCard } from '@/shared/ui';

const Tag = ({ label }: { label: string }) => (
  <View className="mr-2 rounded-full bg-blue-50 px-3 py-1 dark:bg-blue-950">
    <Text className="text-xs font-medium text-blue-500 dark:text-blue-400">{label}</Text>
  </View>
);

const RecordCard = ({ item, color }: { item: VoiceRecord; color: Colors }) => {
  const isListened = item.status === 'read';

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

  return (
    <View className="rounded-2xl p-4" style={cardStyle}>
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
        {isListened ? (
          <CheckCircle size={14} color={color.accent.success} strokeWidth={2} />
        ) : (
          <Clock size={14} color={color.icon.muted} strokeWidth={2} />
        )}
        <Text className="ml-1 text-xs" style={textSecondaryStyle}>
          {item.duration}
          {'  '}
          {item.createdAt}
        </Text>
      </View>

      <Text className="mb-3 text-sm leading-5" style={textSecondaryStyle} numberOfLines={2}>
        {item.transcript}
      </Text>

      {item.tags && item.tags.length > 0 ? (
        <View className="flex-row flex-wrap">
          {item.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const SectionHeader = ({ title, color }: { title: string; color: Colors }) => {
  const headerBgStyle = { backgroundColor: color.background.secondary };
  const headerTextStyle = { color: color.text.secondary };

  return (
    <View className="mx-4 mb-2 mt-4" style={headerBgStyle}>
      <Text className="text-xs font-semibold uppercase tracking-widest" style={headerTextStyle}>
        {title}
      </Text>
    </View>
  );
};

export const InboxScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const { records, deleteRecord, togglePin, isLoaded } = useRecordStore();

  const loadingStyle = {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: color.background.primary,
  };
  const screenStyle = { backgroundColor: color.background.primary };
  const headerStyle = {
    backgroundColor: color.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
  };
  const titleStyle = { color: color.text.primary };
  const subtitleStyle = { color: color.text.secondary };
  const listContentStyle = {
    paddingBottom: 100,
    paddingTop: 4,
    backgroundColor: color.background.secondary,
  };
  const listStyle = { backgroundColor: color.background.secondary };

  if (!isLoaded) {
    return (
      <View style={loadingStyle}>
        <ActivityIndicator size="large" color={color.accent.primary} />
      </View>
    );
  }

  const pinned = records.filter((r) => r.isPinned);
  const all = records.filter((r) => !r.isPinned);

  const sections = [
    ...(pinned.length > 0 ? [{ title: 'Закреплённые', data: pinned }] : []),
    ...(all.length > 0 ? [{ title: 'Все записи', data: all }] : []),
  ];

  const totalCount = records.length;

  return (
    <SafeAreaView className="flex-1" style={screenStyle} edges={['top']}>
      <View className="px-4 pb-3 pt-4" style={headerStyle}>
        <Text className="text-2xl font-bold" style={titleStyle}>
          Входящие
        </Text>
        <Text className="mt-1 text-sm" style={subtitleStyle}>
          {totalCount} записей
        </Text>
      </View>

      {totalCount === 0 ? (
        <EmptyState
          title="Нет входящих"
          description="Здесь будут отображаться ваши входящие голосовые сообщения"
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableCard
              isPinned={item.isPinned}
              onDelete={() => deleteRecord(item.id)}
              onPin={() => togglePin(item.id)}
            >
              <RecordCard item={item} color={color} />
            </SwipeableCard>
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} color={color} />
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={listContentStyle}
          style={listStyle}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};
