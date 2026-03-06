import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, CheckCircle2, Clock, Loader, MicOff, Pin } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  SectionList,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation/RootNavigator';
import type { RecordingStatus, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { type Colors, getColors } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';
import { EmptyState, SwipeableCard } from '@/shared/ui';

const Tag = ({ label }: { label: string }) => (
  <View className="mr-2 rounded-full bg-blue-50 px-3 py-1 dark:bg-blue-950">
    <Text className="text-xs font-medium text-blue-500 dark:text-blue-400">{label}</Text>
  </View>
);

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  onPress: () => void;
};

const AiStatusPill = ({ aiStatus, onPress }: AiStatusPillProps) => {
  if (aiStatus === 'done') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <CheckCircle2 size={20} color="#22c55e" strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'processing') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 dark:bg-blue-950"
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Loader size={11} color="#3b82f6" strokeWidth={2.5} />
        <Text className="text-xs font-medium text-blue-500 dark:text-blue-400">
          Транскрибируется...
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 dark:bg-red-950"
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color="#ef4444" strokeWidth={2.5} />
        <Text className="text-xs font-medium text-red-500 dark:text-red-400">Ошибка</Text>
      </TouchableOpacity>
    );
  }

  // idle
  return (
    <TouchableOpacity
      className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800"
      onPress={onPress}
      activeOpacity={0.75}
    >
      <MicOff size={11} color="#9ca3af" strokeWidth={2.5} />
      <Text className="text-xs font-medium text-gray-400 dark:text-gray-500">Нет транскрипта</Text>
    </TouchableOpacity>
  );
};

const RecordCard = ({
  item,
  color,
  onPress,
  onStatusPress,
}: {
  item: VoiceRecord;
  color: Colors;
  onPress: () => void;
  onStatusPress: () => void;
}) => {
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

      {item.transcript ? (
        <Text className="mb-3 text-sm leading-5" style={textSecondaryStyle} numberOfLines={2}>
          {item.transcript}
        </Text>
      ) : null}

      {showBottomRow ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row flex-wrap gap-y-1">
            {hasTags ? item.tags!.map((tag) => <Tag key={tag} label={tag} />) : null}
          </View>
          {item.aiStatus ? <AiStatusPill aiStatus={item.aiStatus} onPress={onStatusPress} /> : null}
        </View>
      ) : null}
    </TouchableOpacity>
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

const simulateTranscription = (
  id: string,
  updateAiStatus: (id: string, status: RecordingStatus, progress?: number) => void,
) => {
  updateAiStatus(id, 'processing', 0);
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      clearInterval(interval);
      updateAiStatus(id, 'done', 100);
    } else {
      updateAiStatus(id, 'processing', Math.min(progress, 99));
    }
  }, 600);
};

export const InboxScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { records, deleteRecord, togglePin, isLoaded, updateAiStatus } = useRecordStore();

  const handleStatusPress = (item: VoiceRecord) => {
    switch (item.aiStatus) {
      case 'idle':
        simulateTranscription(item.id, updateAiStatus);
        break;
      case 'processing':
        navigation.navigate('RecordingDetail', { record: item });
        break;
      case 'error':
        simulateTranscription(item.id, updateAiStatus);
        break;
      case 'done':
        navigation.navigate('RecordingDetail', { record: item });
        break;
    }
  };

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
              <RecordCard
                item={item}
                color={color}
                onPress={() => navigation.navigate('RecordingDetail', { record: item })}
                onStatusPress={() => handleStatusPress(item)}
              />
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
