import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import RNFS from 'react-native-fs';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useRecordStore } from '@/entities/record';
import type { TranscriptionLanguage } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { useRecordActions } from '@/features/record-actions';
import { useShareRecord } from '@/features/share-record';
import { useTranscription } from '@/features/transcription';
import { getColors, useAppTheme } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';
import { AudioPlayer } from '@/widgets/audio-player';

import type { Tab } from '../config';
import { AskAIModal } from './AskAIModal';
import { AudioLanguageSelector } from './AudioLanguageSelector';
import { RecordingDetailCard } from './RecordingDetailCard';
import { RecordingDetailHeader } from './RecordingDetailHeader';
import { RecordingDetailTabBar } from './RecordingDetailTabBar';
import { RelatedNotesSection } from './RelatedNotesSection';
import { SummaryTab } from './SummaryTab';
import { TasksTab } from './TasksTab';
import { TranscriptContent } from './TranscriptContent';

export const RecordingDetailScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordingDetail'>>();
  const color = getColors(useAppTheme());
  const isTablet = useIsTablet();

  const { record: routeRecord } = route.params;
  const recordId = routeRecord.id;

  const {
    liveRecord,
    togglePin,
    toggleTask,
    setSummaryStatus,
    setTasksStatus,
    clearAudioPath,
    archiveRecord,
    unarchiveRecord,
  } = useRecordStore(
    useShallow((s) => ({
      liveRecord: s.records.find((r) => r.id === recordId) ?? routeRecord,
      togglePin: s.togglePin,
      toggleTask: s.toggleTask,
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      clearAudioPath: s.clearAudioPath,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
    })),
  );

  const { whisperModelStatuses, selectedWhisperModel, globalTranscriptionLanguage } =
    useSettingsStore(
      useShallow((s) => ({
        whisperModelStatuses: s.whisperModelStatuses,
        selectedWhisperModel: s.selectedWhisperModel,
        globalTranscriptionLanguage: s.transcriptionLanguage,
      })),
    );

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [recordLanguage, setRecordLanguage] = useState<TranscriptionLanguage>(
    globalTranscriptionLanguage,
  );

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setRecordLanguage(globalTranscriptionLanguage);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setActiveTab('transcript');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching records
  }, [routeRecord.id]);

  const { startTranscription, cancelTranscription } = useTranscription();
  const { generateSummary, extractTasks } = useAiProcessing();
  const { shareRecord, shareAudio } = useShareRecord();
  const onDeleted = useCallback(() => navigation.goBack(), [navigation]);
  const { promptRename, promptDelete } = useRecordActions({ onDeleted });

  const handleToggleTask = useCallback(
    (taskId: string) => {
      toggleTask(liveRecord.id, taskId).catch(() => {});
    },
    [liveRecord.id, toggleTask],
  );

  const handleRetranscribe = useCallback(async () => {
    const modelStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';

    if (modelStatus !== 'downloaded') {
      Alert.alert(
        t('recordingDetail.modelNotDownloaded'),
        t('recordingDetail.modelNotDownloadedHint'),
        [
          { text: t('common.ok') },
          {
            text: t('recordingDetail.goToWhisperSettings'),
            onPress: () => {
              navigation.navigate('Main', {
                screen: 'SettingsRoot',
                params: { screen: 'WhisperModelPicker' },
              });
            },
          },
        ],
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
  }, [
    t,
    whisperModelStatuses,
    selectedWhisperModel,
    navigation,
    liveRecord,
    recordLanguage,
    clearAudioPath,
    startTranscription,
  ]);

  const handleCancelTranscription = useCallback(() => {
    cancelTranscription(liveRecord.id);
  }, [liveRecord.id, cancelTranscription]);

  const handleGenerateSummary = useCallback(() => {
    generateSummary(liveRecord).catch(() => {});
  }, [liveRecord, generateSummary]);

  const handleExtractTasks = useCallback(() => {
    extractTasks(liveRecord).catch(() => {});
  }, [liveRecord, extractTasks]);

  const handleShare = useCallback(() => {
    shareRecord(liveRecord).catch((err: Error) => {
      Alert.alert(t('recordingDetail.shareFailed'), err.message);
    });
  }, [t, liveRecord, shareRecord]);

  const handleShareAudio = useCallback(() => {
    shareAudio(liveRecord).catch((err: Error) => {
      Alert.alert(t('recordingDetail.shareFailed'), err.message);
    });
  }, [t, liveRecord, shareAudio]);

  const scrollPadding = isTablet ? 24 : 16;
  const contentMaxWidth = isTablet ? 720 : undefined;

  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const onTogglePin = useCallback(() => togglePin(liveRecord.id), [liveRecord.id, togglePin]);
  const onAskAI = useCallback(() => setShowAskAIModal(true), []);
  const onRename = useCallback(() => promptRename(liveRecord), [liveRecord, promptRename]);
  const onArchive = useCallback(() => archiveRecord(liveRecord.id), [liveRecord.id, archiveRecord]);
  const onUnarchive = useCallback(
    () => unarchiveRecord(liveRecord.id),
    [liveRecord.id, unarchiveRecord],
  );
  const onDelete = useCallback(() => promptDelete(liveRecord), [liveRecord, promptDelete]);

  const handleDismissSummaryError = useCallback(() => {
    setSummaryStatus(liveRecord.id, 'done');
    setTasksStatus(liveRecord.id, 'done');
  }, [liveRecord.id, setSummaryStatus, setTasksStatus]);

  const onDismissAskAIModal = useCallback(() => setShowAskAIModal(false), []);

  return (
    <View className="flex-1" style={{ backgroundColor: color.background.secondary }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        onBack={onBack}
        onTogglePin={onTogglePin}
        onShare={handleShare}
        onShareAudio={handleShareAudio}
        onAskAI={onAskAI}
        onRename={onRename}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: scrollPadding,
          gap: 12,
          paddingBottom: 40,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: 12 }}>
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
            <View
              style={
                activeTab !== 'transcript'
                  ? {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: -1,
                    }
                  : undefined
              }
            >
              <TranscriptContent
                record={liveRecord}
                color={color}
                onTranscribe={handleRetranscribe}
                onCancelTranscription={handleCancelTranscription}
              />
            </View>
            <View
              style={
                activeTab !== 'summary'
                  ? {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: -1,
                    }
                  : undefined
              }
            >
              <SummaryTab
                summary={liveRecord.summary ?? ''}
                keyPhrases={liveRecord.keyPhrases}
                status={liveRecord.summaryStatus ?? 'idle'}
                hasTranscript={Boolean(liveRecord.transcript)}
                color={color}
                onGenerate={handleGenerateSummary}
                onDismissError={handleDismissSummaryError}
              />
            </View>
            <View
              style={
                activeTab !== 'tasks'
                  ? {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      opacity: 0,
                      pointerEvents: 'none',
                      zIndex: -1,
                    }
                  : undefined
              }
            >
              <TasksTab
                tasks={liveRecord.tasks ?? []}
                nextSteps={liveRecord.nextSteps}
                status={liveRecord.tasksStatus ?? 'idle'}
                hasTranscript={Boolean(liveRecord.transcript)}
                recordTitle={liveRecord.title}
                color={color}
                onToggle={handleToggleTask}
                onExtract={handleExtractTasks}
                onDismissError={handleDismissSummaryError}
              />
            </View>
          </View>

          <RelatedNotesSection recordId={liveRecord.id} color={color} />
        </View>
        <AskAIModal
          visible={showAskAIModal}
          record={liveRecord}
          color={color}
          onDismiss={onDismissAskAIModal}
        />
      </ScrollView>
    </View>
  );
};
