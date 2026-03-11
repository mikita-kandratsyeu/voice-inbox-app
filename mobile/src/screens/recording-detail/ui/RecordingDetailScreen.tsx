import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, useColorScheme, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
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
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingDetail'>>();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  const { record: routeRecord } = route.params;
  const { records, togglePin, toggleTask } = useRecordStore();
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);

  const liveRecord: VoiceRecord = records.find((r) => r.id === routeRecord.id) ?? routeRecord;

  const [activeTab, setActiveTab] = useState<Tab>('transcript');

  const { startTranscription, cancelTranscription } = useTranscription();
  const { generateSummary, extractTasks } = useAiProcessing();
  const { shareRecord } = useShareRecord();
  const { promptRename, promptDelete } = useRecordActions({
    onDeleted: () => navigation.goBack(),
  });

  const handleToggleTask = (taskId: string) => {
    toggleTask(liveRecord.id, taskId).catch(() => {});
  };

  const handleRetranscribe = () => {
    const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';

    if (modelStatus !== 'downloaded') {
      Alert.alert(
        t('recordingDetail.modelNotDownloaded'),
        t('recordingDetail.modelNotDownloadedHint'),
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
    generateSummary(liveRecord).catch(() => {});
  };

  const handleExtractTasks = () => {
    extractTasks(liveRecord).catch(() => {});
  };

  const handleShare = () => {
    shareRecord(liveRecord).catch((err: Error) => {
      Alert.alert(t('recordingDetail.shareFailed'), err.message);
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        onBack={() => navigation.goBack()}
        onTogglePin={() => togglePin(liveRecord.id)}
        onShare={handleShare}
        onRename={() => promptRename(liveRecord)}
        onDelete={() => promptDelete(liveRecord)}
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
              status={liveRecord.summaryStatus ?? 'idle'}
              hasTranscript={Boolean(liveRecord.transcript)}
              color={color}
              onGenerate={handleGenerateSummary}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={liveRecord.tasks ?? []}
              status={liveRecord.tasksStatus ?? 'idle'}
              hasTranscript={Boolean(liveRecord.transcript)}
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
