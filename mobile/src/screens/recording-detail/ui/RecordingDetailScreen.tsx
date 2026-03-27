import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { FolderPickerSheet, useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import type { TranscriptionLanguage } from '@/entities/settings';
import { getWhisperModelVariantId, useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import { useRecordActions } from '@/features/record-actions';
import { useShareRecord } from '@/features/share-record';
import { useTranscription } from '@/features/transcription';
import { useColors } from '@/shared/config';
import { resolveDisplayFolderColor, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';
import { AudioPlayer, usePlaybackPosition } from '@/widgets/audio-player';

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
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: windowWidth } = useWindowDimensions();

  const { record: routeRecord } = route.params;
  const recordId = routeRecord.id;

  const {
    liveRecord,
    togglePin,
    toggleTask,
    updateTasks,
    setSummaryStatus,
    setTasksStatus,
    clearAudioPath,
    archiveRecord,
    unarchiveRecord,
    hydrateRecordDetails,
    setRecordFolder,
  } = useRecordStore(
    useShallow((s) => ({
      liveRecord: s.records.find((r) => r.id === recordId) ?? routeRecord,
      togglePin: s.togglePin,
      toggleTask: s.toggleTask,
      updateTasks: s.updateTasks,
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      clearAudioPath: s.clearAudioPath,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
      hydrateRecordDetails: s.hydrateRecordDetails,
      setRecordFolder: s.setRecordFolder,
    })),
  );

  const folders = useFolderStore(useShallow((s) => s.folders));
  const { isProActive } = useProEntitlement();

  const folderPlacement = useMemo(() => {
    const fid = liveRecord.folderId;
    if (!fid) return { kind: 'inbox' as const };
    const f = folders.find((x) => x.id === fid);
    if (!f) return { kind: 'missing' as const };
    return {
      kind: 'folder' as const,
      folder: f,
      tintHex: resolveDisplayFolderColor(f.color, isProActive),
    };
  }, [liveRecord.folderId, folders, isProActive]);

  const {
    whisperModelStatuses,
    selectedWhisperModel,
    selectedWhisperModelFormat,
    globalTranscriptionLanguage,
    aiExecutionMode,
    setAiExecutionMode,
  } = useSettingsStore(
    useShallow((s) => ({
      whisperModelStatuses: s.whisperModelStatuses,
      selectedWhisperModel: s.selectedWhisperModel,
      selectedWhisperModelFormat: s.selectedWhisperModelFormat,
      globalTranscriptionLanguage: s.transcriptionLanguage,
      aiExecutionMode: s.aiExecutionMode,
      setAiExecutionMode: s.setAiExecutionMode,
    })),
  );

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(['transcript']));
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const { currentPositionMs, onPositionUpdate } = usePlaybackPosition();
  const [recordLanguage, setRecordLanguage] = useState<TranscriptionLanguage>(
    globalTranscriptionLanguage,
  );

  const scrollRef = useRef<React.ElementRef<typeof KeyboardAwareScrollView>>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, []),
  );

  useEffect(() => {
    setRecordLanguage(globalTranscriptionLanguage);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setActiveTab('transcript');
    setMountedTabs(new Set(['transcript']));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching records
  }, [routeRecord.id]);

  useEffect(() => {
    void hydrateRecordDetails(recordId);
  }, [hydrateRecordDetails, recordId]);

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

  const handleAddManualTask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const prev = liveRecord.tasks ?? [];
      const id = `${liveRecord.id}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next = [...prev, { id, text: trimmed, isDone: false, source: 'manual' as const }];
      updateTasks(liveRecord.id, next).catch(() => {});
    },
    [liveRecord.id, liveRecord.tasks, updateTasks],
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const prev = liveRecord.tasks ?? [];
      const next = prev.filter((x) => x.id !== taskId);
      updateTasks(liveRecord.id, next).catch(() => {});
    },
    [liveRecord.id, liveRecord.tasks, updateTasks],
  );

  const handleRetranscribe = useCallback(async () => {
    const variantId = getWhisperModelVariantId(selectedWhisperModel, selectedWhisperModelFormat);
    const modelStatus = whisperModelStatuses[variantId] ?? 'not_downloaded';

    if (modelStatus !== 'downloaded') {
      Alert.alert(
        t('recordingDetail.modelNotDownloaded'),
        t('recordingDetail.modelNotDownloadedHint'),
        [
          { text: t('common.ok') },
          {
            text: t('recordingDetail.goToWhisperSettings'),
            onPress: () => {
              navigation.push('WhisperModelPickerRoot');
            },
          },
        ],
      );
      return;
    }

    const path = liveRecord.audioPath;
    if (path?.trim()) {
      const normalizedPath = path.startsWith('file://') ? path.slice(7) : path;
      const exists = await NitroFS.exists(normalizedPath);

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
    selectedWhisperModelFormat,
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
  const contentMaxWidth = useTabletContentMaxWidth();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isPrivateMode = aiExecutionMode === 'private_experimental';

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
  const onMoveToFolderMenu = useCallback(() => setFolderPickerVisible(true), []);
  const onCloseFolderPicker = useCallback(() => setFolderPickerVisible(false), []);
  const onDetailFolderPicked = useCallback(
    (folderId: string | null) => {
      void setRecordFolder(liveRecord.id, folderId);
    },
    [liveRecord.id, setRecordFolder],
  );

  const handleDismissSummaryError = useCallback(() => {
    setSummaryStatus(liveRecord.id, 'done');
    setTasksStatus(liveRecord.id, 'done');
  }, [liveRecord.id, setSummaryStatus, setTasksStatus]);
  const handleSwitchToSmartMode = useCallback(() => {
    setAiExecutionMode('smart_hybrid');
  }, [setAiExecutionMode]);

  const onDismissAskAIModal = useCallback(() => setShowAskAIModal(false), []);

  const onSelectTab = useCallback(
    (tab: Tab) => {
      if (activeTab === 'tasks' && tab !== 'tasks') {
        KeyboardController.dismiss({ animated: true });
      }
      setMountedTabs((prev) => new Set([...prev, tab]));
      setActiveTab(tab);
    },
    [activeTab],
  );

  const shellBackgroundColor = isPrivateMode
    ? color.background.primary
    : color.background.secondary;
  const tabPanelBackgroundColor = isPrivateMode
    ? color.background.secondary
    : color.background.card;

  return (
    <View className="flex-1" style={{ backgroundColor: shellBackgroundColor }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        isPrivateMode={isPrivateMode}
        onBack={onBack}
        onTogglePin={onTogglePin}
        onShare={handleShare}
        onShareAudio={handleShareAudio}
        onAskAI={onAskAI}
        onRename={onRename}
        onMoveToFolder={onMoveToFolderMenu}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
      />
      {!isPrivateMode && (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('folders.moveToFolderTitle')}
          folders={folders}
          currentFolderId={liveRecord.folderId ?? null}
          onClose={onCloseFolderPicker}
          onSelect={onDetailFolderPicked}
        />
      )}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: shellBackgroundColor }}
        contentContainerStyle={{
          padding: scrollPadding,
          gap: 12,
          paddingBottom: insets.bottom + 40,
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={16}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: 12 }}>
          <RecordingDetailCard
            record={liveRecord}
            color={color}
            folderPlacement={folderPlacement}
            hideFolderPlacement={isPrivateMode}
            surfaceBackgroundColor={tabPanelBackgroundColor}
          />

          <View className="overflow-hidden rounded-2xl">
            <AudioPlayer
              duration={liveRecord.duration}
              color={color}
              audioPath={liveRecord.audioPath}
              onPositionChange={onPositionUpdate}
              surfaceBackgroundColor={tabPanelBackgroundColor}
            />
          </View>

          <View className="overflow-hidden rounded-2xl">
            <AudioLanguageSelector
              value={recordLanguage}
              color={color}
              onSelect={setRecordLanguage}
              surfaceBackgroundColor={tabPanelBackgroundColor}
            />
          </View>

          <View
            className="overflow-hidden rounded-2xl"
            style={{ backgroundColor: tabPanelBackgroundColor }}
          >
            <RecordingDetailTabBar active={activeTab} onSelect={onSelectTab} color={color} />
            {mountedTabs.has('transcript') && (
              <View style={activeTab !== 'transcript' ? { display: 'none' } : undefined}>
                <TranscriptContent
                  record={liveRecord}
                  color={color}
                  currentPositionMs={currentPositionMs}
                  onTranscribe={handleRetranscribe}
                  onCancelTranscription={handleCancelTranscription}
                  isPrivateMode={isPrivateMode}
                />
              </View>
            )}
            {mountedTabs.has('summary') && (
              <View style={activeTab !== 'summary' ? { display: 'none' } : undefined}>
                <SummaryTab
                  summary={liveRecord.summary ?? ''}
                  keyPhrases={liveRecord.keyPhrases}
                  status={liveRecord.summaryStatus ?? 'idle'}
                  errorMessage={liveRecord.summaryError}
                  hasTranscript={Boolean(liveRecord.transcript)}
                  color={color}
                  onGenerate={handleGenerateSummary}
                  onDismissError={handleDismissSummaryError}
                  showPrivateModeCta={aiExecutionMode === 'private_experimental'}
                  onSwitchToSmartMode={handleSwitchToSmartMode}
                />
              </View>
            )}
            {mountedTabs.has('tasks') && (
              <View style={activeTab !== 'tasks' ? { display: 'none' } : undefined}>
                <TasksTab
                  tasks={liveRecord.tasks ?? []}
                  nextSteps={liveRecord.nextSteps}
                  status={liveRecord.tasksStatus ?? 'idle'}
                  errorMessage={liveRecord.tasksError}
                  hasTranscript={Boolean(liveRecord.transcript)}
                  recordTitle={liveRecord.title}
                  color={color}
                  onToggle={handleToggleTask}
                  onExtract={handleExtractTasks}
                  onAddManualTask={handleAddManualTask}
                  onDeleteTask={handleDeleteTask}
                  onDismissError={handleDismissSummaryError}
                  showPrivateModeCta={aiExecutionMode === 'private_experimental'}
                  onSwitchToSmartMode={handleSwitchToSmartMode}
                />
              </View>
            )}
          </View>

          <RelatedNotesSection recordId={liveRecord.id} color={color} />

          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </View>
        {!isPrivateMode && (
          <AskAIModal
            visible={showAskAIModal}
            record={liveRecord}
            color={color}
            onDismiss={onDismissAskAIModal}
          />
        )}
      </KeyboardAwareScrollView>
    </View>
  );
};
