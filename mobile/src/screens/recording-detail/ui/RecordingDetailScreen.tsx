import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, useColorScheme, View } from 'react-native';
import RNFS from 'react-native-fs';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import type { TranscriptionLanguage } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { useRecordActions } from '@/features/record-actions';
import { useShareRecord } from '@/features/share-record';
import { useTranscription } from '@/features/transcription';
import { getColors } from '@/shared/config';
import { AudioPlayer } from '@/widgets/audio-player';

import type { Tab } from '../config';
import { AskAIModal } from './AskAIModal';
import { AudioLanguageSelector } from './AudioLanguageSelector';
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
  const { records, togglePin, toggleTask, setSummaryStatus, setTasksStatus, clearAudioPath } =
    useRecordStore();
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const globalTranscriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);

  const liveRecord: VoiceRecord = records.find((r) => r.id === routeRecord.id) ?? routeRecord;

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [recordLanguage, setRecordLanguage] = useState<TranscriptionLanguage>(
    globalTranscriptionLanguage,
  );

  useEffect(() => {
    setRecordLanguage(globalTranscriptionLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching records
  }, [routeRecord.id]);

  useEffect(() => {
    const path = liveRecord.audioPath;
    if (!path?.trim()) return;

    const normalizedPath = path.startsWith('file://') ? path.slice(7) : path;
    RNFS.exists(normalizedPath).then((exists) => {
      if (!exists) {
        clearAudioPath(liveRecord.id).catch(() => {});
      }
    });
  }, [liveRecord.id, liveRecord.audioPath, clearAudioPath]);

  const { startTranscription, cancelTranscription } = useTranscription();
  const { generateSummary, extractTasks } = useAiProcessing();
  const { shareRecord, shareAudio } = useShareRecord();
  const { promptRename, promptDelete } = useRecordActions({
    onDeleted: () => navigation.goBack(),
  });

  const handleToggleTask = (taskId: string) => {
    toggleTask(liveRecord.id, taskId).catch(() => {});
  };

  const handleRetranscribe = async () => {
    const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';

    if (modelStatus !== 'downloaded') {
      Alert.alert(
        t('recordingDetail.modelNotDownloaded'),
        t('recordingDetail.modelNotDownloadedHint'),
        [{ text: 'OK' }],
      );
      return;
    }

    const path = liveRecord.audioPath;
    if (path?.trim()) {
      const normalizedPath = path.startsWith('file://') ? path.slice(7) : path;
      const exists = await RNFS.exists(normalizedPath);
      if (!exists) {
        await clearAudioPath(liveRecord.id).catch(() => {});
        Alert.alert(t('recordingDetail.shareFailed'), t('share.audioNotFound'));
        return;
      }
    }

    startTranscription(liveRecord, recordLanguage);
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

  const handleShareAudio = () => {
    shareAudio(liveRecord).catch((err: Error) => {
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
        onShareAudio={handleShareAudio}
        onAskAI={() => setShowAskAIModal(true)}
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

        <View className="overflow-hidden rounded-2xl">
          <AudioLanguageSelector
            value={recordLanguage}
            color={color}
            onSelect={setRecordLanguage}
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
              onDismissError={() => {
                setSummaryStatus(liveRecord.id, 'done');
                setTasksStatus(liveRecord.id, 'done');
              }}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={liveRecord.tasks ?? []}
              status={liveRecord.tasksStatus ?? 'idle'}
              hasTranscript={Boolean(liveRecord.transcript)}
              recordTitle={liveRecord.title}
              color={color}
              onToggle={handleToggleTask}
              onExtract={handleExtractTasks}
              onDismissError={() => {
                setSummaryStatus(liveRecord.id, 'done');
                setTasksStatus(liveRecord.id, 'done');
              }}
            />
          )}
        </View>

        <AskAIModal
          visible={showAskAIModal}
          record={liveRecord}
          color={color}
          onDismiss={() => setShowAskAIModal(false)}
        />
      </ScrollView>
    </View>
  );
};
