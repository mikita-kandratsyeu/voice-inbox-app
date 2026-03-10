import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, ScrollView, useColorScheme, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { TaskItem, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useRecordActions } from '@/features/record-actions';
import { useShareRecord } from '@/features/share-record';
import { useTranscription } from '@/features/transcription';
import { getColors } from '@/shared/config';
import { AudioPlayer } from '@/widgets/audio-player';

import type { Tab } from '../config';
import { RecordingDetailCard } from './RecordingDetailCard';
import { RecordingDetailHeader } from './RecordingDetailHeader';
import { RecordingDetailTabBar } from './RecordingDetailTabBar';
import { SummaryTab } from './SummaryTab';
import { TasksTab } from './TasksTab';
import { TranscriptContent } from './TranscriptContent';

export const RecordingDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingDetail'>>();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  const { record: routeRecord } = route.params;
  const { records, togglePin } = useRecordStore();
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);

  const liveRecord: VoiceRecord = records.find((r) => r.id === routeRecord.id) ?? routeRecord;

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(liveRecord.tasks ?? []);

  const { startTranscription, cancelTranscription } = useTranscription();
  const { shareRecord } = useShareRecord();
  const { promptRename, promptDelete } = useRecordActions({
    onDeleted: () => navigation.goBack(),
  });

  const handleToggleTask = (id: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t)));
  };

  const handleRetranscribe = () => {
    const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';

    if (modelStatus !== 'downloaded') {
      Alert.alert(
        'Модель не скачана',
        'Для транскрипции необходимо скачать модель Whisper в настройках.',
        [{ text: 'OK' }],
      );
      return;
    }

    startTranscription(liveRecord);
  };

  const handleCancelTranscription = () => {
    cancelTranscription(liveRecord.id);
  };

  const handleGenerateSummary = () => {
    // placeholder — will call AI API in the future
  };

  const handleExtractTasks = () => {
    // placeholder — will call AI API in the future
  };

  const handleShare = () => {
    shareRecord(liveRecord).catch((err: Error) => {
      Alert.alert('Share failed', err.message);
    });
  };

  const handleMore = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Rename', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) promptRename(liveRecord);
          if (buttonIndex === 2) promptDelete(liveRecord);
        },
      );
    } else {
      Alert.alert('Note actions', undefined, [
        { text: 'Rename', onPress: () => promptRename(liveRecord) },
        { text: 'Delete', style: 'destructive', onPress: () => promptDelete(liveRecord) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        onBack={() => navigation.goBack()}
        onTogglePin={() => togglePin(liveRecord.id)}
        onShare={handleShare}
        onMore={handleMore}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <RecordingDetailCard record={liveRecord} color={color} />

        <View className="overflow-hidden rounded-2xl">
          <AudioPlayer
            duration={liveRecord.duration}
            color={color}
            audioPath={liveRecord.audioPath}
          />
        </View>

        <View
          className="overflow-hidden rounded-2xl"
          style={{ backgroundColor: color.background.card }}
        >
          <RecordingDetailTabBar active={activeTab} onSelect={setActiveTab} color={color} />
          {activeTab === 'transcript' && (
            <TranscriptContent
              record={liveRecord}
              color={color}
              onTranscribe={handleRetranscribe}
              onCancelTranscription={handleCancelTranscription}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryTab
              summary={liveRecord.summary ?? ''}
              color={color}
              onGenerate={handleGenerateSummary}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={localTasks}
              color={color}
              onToggle={handleToggleTask}
              onExtract={handleExtractTasks}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};
