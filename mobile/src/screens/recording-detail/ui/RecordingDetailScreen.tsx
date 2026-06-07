import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, LayoutAnimation, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { FolderPickerSheet, useFolderStore } from '@/entities/folder';
import {
  type MeetingSummaryTemplate,
  type RecordingMark,
  type RecordingStatus,
  useRecordStore,
} from '@/entities/record';
import type { TranscriptionLanguage } from '@/entities/settings';
import {
  areFoldersEnabledInAiMode,
  getWhisperModelVariantId,
  isPrivateCustomServerMode,
  useSettingsStore,
} from '@/entities/settings';
import { resumeCloudSummarizeForRecord, useAiProcessing } from '@/features/ai-processing';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import { useRecordActions } from '@/features/record-actions';
import type { ShareBriefTemplate, ShareRecordExportFormat } from '@/features/share-record';
import { saveLastShareRecipientEmail, useShareRecord } from '@/features/share-record';
import { useTranscription } from '@/features/transcription';
import { useAppTheme, useColors } from '@/shared/config';
import {
  hapticError,
  hapticLight,
  hapticSelection,
  hapticSuccess,
  resolveAudioPath,
  resolveFolderListTintHex,
  useIsTablet,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';
import { NitroFS } from '@/shared/lib/fs';
import { BlockingProgressModal } from '@/shared/ui';
import { AudioPlayer, type AudioPlayerRef, usePlaybackPosition } from '@/widgets/audio-player';

import type { Tab } from '../config';
import { renameSpeakerGroup } from '../lib/meetingSpeakerLabels';
import { AudioLanguageSelector } from './AudioLanguageSelector';
import { MeetingDialogueTab } from './MeetingDialogueTab';
import { RecordingDetailCard } from './RecordingDetailCard';
import { RecordingDetailHeader } from './RecordingDetailHeader';
import { RecordingDetailTabBar } from './RecordingDetailTabBar';
import { RecordingMarksSection } from './RecordingMarksSection';
import { RecordingMeetingModeSection } from './RecordingMeetingModeSection';
import { RelatedNotesSection } from './RelatedNotesSection';
import { ShareRecordSheet } from './ShareRecordSheet';
import { SummaryTab } from './SummaryTab';
import { TaskEditSheet } from './TaskEditSheet';
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
    promoteNextStepToTask,
    setSummaryStatus,
    setTasksStatus,
    setMeetingDialogueStatus,
    setMeetingDialogueError,
    clearAudioPath,
    archiveRecord,
    unarchiveRecord,
    hydrateRecordDetails,
    setRecordFolder,
    renameRecord,
    updateRecordingMarks,
    updateAiExtras,
  } = useRecordStore(
    useShallow((s) => ({
      liveRecord: s.records.find((r) => r.id === recordId) ?? routeRecord,
      togglePin: s.togglePin,
      toggleTask: s.toggleTask,
      updateTasks: s.updateTasks,
      promoteNextStepToTask: s.promoteNextStepToTask,
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      setMeetingDialogueStatus: s.setMeetingDialogueStatus,
      setMeetingDialogueError: s.setMeetingDialogueError,
      clearAudioPath: s.clearAudioPath,
      archiveRecord: s.archiveRecord,
      unarchiveRecord: s.unarchiveRecord,
      hydrateRecordDetails: s.hydrateRecordDetails,
      setRecordFolder: s.setRecordFolder,
      renameRecord: s.renameRecord,
      updateRecordingMarks: s.updateRecordingMarks,
      updateAiExtras: s.updateAiExtras,
    })),
  );

  const folders = useFolderStore(useShallow((s) => s.folders));
  const { isProActive } = useProEntitlement();
  const scheme = useAppTheme();

  const folderPlacement = useMemo(() => {
    const fid = liveRecord.folderId;
    if (!fid) return { kind: 'inbox' as const };
    const f = folders.find((x) => x.id === fid);
    if (!f) return { kind: 'missing' as const };
    return {
      kind: 'folder' as const,
      folder: f,
      tintHex: resolveFolderListTintHex(f.color, isProActive, scheme),
    };
  }, [liveRecord.folderId, folders, isProActive, scheme]);

  const {
    whisperModelStatuses,
    selectedWhisperModel,
    selectedWhisperModelFormat,
    globalTranscriptionLanguage,
    aiExecutionMode,
    privateAiProvider,
    setAiExecutionMode,
  } = useSettingsStore(
    useShallow((s) => ({
      whisperModelStatuses: s.whisperModelStatuses,
      selectedWhisperModel: s.selectedWhisperModel,
      selectedWhisperModelFormat: s.selectedWhisperModelFormat,
      globalTranscriptionLanguage: s.transcriptionLanguage,
      aiExecutionMode: s.aiExecutionMode,
      privateAiProvider: s.privateAiProvider,
      setAiExecutionMode: s.setAiExecutionMode,
    })),
  );

  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(['transcript']));
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const { currentPositionMs, onPositionUpdate } = usePlaybackPosition();
  const [recordLanguage, setRecordLanguage] = useState<TranscriptionLanguage>(
    globalTranscriptionLanguage,
  );

  const scrollRef = useRef<React.ElementRef<typeof KeyboardAwareScrollView>>(null);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  useFocusEffect(
    useCallback(() => {
      const { records, markAsRead } = useRecordStore.getState();
      const r = records.find((x) => x.id === recordId);
      if (r?.status === 'unread') {
        void markAsRead(recordId);
      }
      return () => {
        KeyboardController.dismiss({ animated: false });
      };
    }, [recordId]),
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

  useEffect(() => {
    resumeCloudSummarizeForRecord(recordId);
  }, [recordId]);

  const { startTranscription, cancelTranscription, discardPausedTranscription } =
    useTranscription();
  const { generateSummary, extractTasks, cancelAiGeneration, regenerateMeetingDialogue } =
    useAiProcessing();
  const handleCancelAiGeneration = useCallback(() => {
    cancelAiGeneration(liveRecord.id);
  }, [cancelAiGeneration, liveRecord.id]);
  const { shareRecord, shareAudio, emailRecord, isGeneratingSharePdf } = useShareRecord();
  const onDeleted = useCallback(() => navigation.goBack(), [navigation]);
  const { promptDelete } = useRecordActions({ onDeleted });

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

  const handleEditTask = useCallback(
    (taskId: string, newText: string): boolean => {
      const trimmed = newText.trim();

      if (!trimmed) return false;

      const prev = liveRecord.tasks ?? [];
      const duplicate = prev.some(
        (x) => x.id !== taskId && x.text.trim().toLowerCase() === trimmed.toLowerCase(),
      );

      if (duplicate) {
        Alert.alert(t('recordingDetail.nextSteps'), t('recordingDetail.nextStepAlreadyInTasks'));
        return false;
      }

      const next = prev.map((x) => (x.id === taskId ? { ...x, text: trimmed } : x));
      updateTasks(liveRecord.id, next).catch(() => {});

      return true;
    },
    [liveRecord.id, liveRecord.tasks, t, updateTasks],
  );

  const handlePromoteNextStepToTask = useCallback(
    async (step: string, stepIndex: number) => {
      const trimmed = step.trim();
      if (!trimmed) return;

      const prev = liveRecord.tasks ?? [];
      if (prev.some((x) => x.text.trim().toLowerCase() === trimmed.toLowerCase())) {
        Alert.alert(t('recordingDetail.nextSteps'), t('recordingDetail.nextStepAlreadyInTasks'));
        return;
      }

      const steps = liveRecord.nextSteps ?? [];
      if (stepIndex < 0 || stepIndex >= steps.length) return;
      if (steps[stepIndex]?.trim() !== trimmed) return;

      const id = `${liveRecord.id}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const nextTasks = [...prev, { id, text: trimmed, isDone: false, source: 'manual' as const }];
      const nextStepsList = steps.filter((_, i) => i !== stepIndex);

      hapticSelection();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      try {
        await promoteNextStepToTask(liveRecord.id, nextTasks, nextStepsList);
      } catch {
        // no-op
      }
    },
    [liveRecord.id, liveRecord.tasks, liveRecord.nextSteps, t, promoteNextStepToTask],
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
      const normalizedPath = resolveAudioPath(path);
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

  const handleDiscardPausedTranscription = useCallback(() => {
    Alert.alert(
      t('transcription.resumeTitle'),
      t('transcription.resumeBody', { title: liveRecord.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transcription.cancelResume'),
          style: 'destructive',
          onPress: () => {
            discardPausedTranscription(liveRecord.id).catch(() => {});
          },
        },
      ],
    );
  }, [discardPausedTranscription, liveRecord.id, liveRecord.title, t]);

  const handleGenerateSummary = useCallback(
    (options?: { taskExtractionHint?: string }) => {
      generateSummary(liveRecord, options).catch(() => {});
    },
    [liveRecord, generateSummary],
  );

  const handleExtractTasks = useCallback(
    (options?: { taskExtractionHint?: string }) => {
      extractTasks(liveRecord, options).catch(() => {});
    },
    [liveRecord, extractTasks],
  );

  const handleShare = useCallback(
    (template: ShareBriefTemplate, format: ShareRecordExportFormat) => {
      return shareRecord(liveRecord, template, format).catch((err: unknown) => {
        Alert.alert(t('recordingDetail.shareFailed'), toUserFacingFetchErrorFromUnknown(err));
      });
    },
    [t, liveRecord, shareRecord],
  );

  const handleShareAudio = useCallback(() => {
    shareAudio(liveRecord).catch((err: unknown) => {
      Alert.alert(t('recordingDetail.shareFailed'), toUserFacingFetchErrorFromUnknown(err));
    });
  }, [t, liveRecord, shareAudio]);
  const handleEmailRecord = useCallback(
    (email: string, template: ShareBriefTemplate, format: ShareRecordExportFormat) => {
      setEmailSending(true);
      emailRecord(liveRecord, email, template, format)
        .then(() => {
          saveLastShareRecipientEmail(email);
          hapticSuccess();
          setShareSheetVisible(false);
          Alert.alert(t('share.emailSentTitle'), t('share.emailSentMessage', { email }));
        })
        .catch((err: unknown) => {
          hapticError();
          Alert.alert(t('share.emailFailedTitle'), toUserFacingFetchErrorFromUnknown(err));
        })
        .finally(() => {
          setEmailSending(false);
        });
    },
    [emailRecord, liveRecord, t],
  );
  const onOpenShareMenu = useCallback(() => {
    if (isProActive) {
      setShareSheetVisible(true);
      return;
    }
    handleShare('noteBrief', 'markdown');
  }, [isProActive, handleShare]);
  const onCloseShareMenu = useCallback(() => setShareSheetVisible(false), []);

  const scrollPadding = isTablet ? 24 : 16;
  const contentMaxWidth = useTabletContentMaxWidth('wide');
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const isPrivateCustomServer = isPrivateCustomServerMode(aiExecutionMode, privateAiProvider);
  const foldersEnabled = areFoldersEnabledInAiMode(aiExecutionMode, privateAiProvider);
  const isMeetingMode = liveRecord.classification === 'meeting';
  const aiBusy =
    liveRecord.summaryStatus === 'processing' ||
    liveRecord.tasksStatus === 'processing' ||
    liveRecord.meetingDialogueStatus === 'processing';

  const meetingDialogueTabStatus = useMemo((): RecordingStatus => {
    if (liveRecord.meetingDialogueStatus === 'processing') return 'processing';
    if (liveRecord.meetingDialogueStatus === 'failed') return 'error';
    if (liveRecord.meetingDialogue?.trim()) return 'done';
    return 'idle';
  }, [liveRecord.meetingDialogue, liveRecord.meetingDialogueStatus]);

  const hasTranscript = Boolean(liveRecord.transcript?.trim());
  const hasAudio = Boolean(liveRecord.audioPath?.trim());
  const showMeetingModeToggle = isProActive && hasTranscript;

  const applyMeetingModeOff = useCallback(() => {
    void updateAiExtras(liveRecord.id, {
      classification: null,
      meetingDialogue: null,
      meetingSpeakerLabels: null,
    });
  }, [liveRecord.id, updateAiExtras]);

  const promptRegenerateAfterMeetingOn = useCallback(() => {
    const hasPriorSummary =
      Boolean(liveRecord.summary?.trim()) ||
      liveRecord.summaryStatus === 'done' ||
      liveRecord.summaryStatus === 'error';
    if (!hasPriorSummary) return;

    Alert.alert(
      t('recordingDetail.meetingModeRegenerateTitle'),
      t('recordingDetail.meetingModeRegenerateMessage'),
      [
        { text: t('recordingDetail.meetingModeRegenerateLater'), style: 'cancel' },
        {
          text: t('recordingDetail.meetingModeRegenerateConfirm'),
          onPress: () => {
            generateSummary(liveRecord).catch(() => {});
          },
        },
      ],
    );
  }, [generateSummary, liveRecord, t]);

  const handleToggleMeetingMode = useCallback(() => {
    if (aiBusy) return;

    hapticLight();

    if (isMeetingMode) {
      if (liveRecord.meetingDialogue?.trim()) {
        Alert.alert(
          t('recordingDetail.meetingModeDisableTitle'),
          t('recordingDetail.meetingModeDisableMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('recordingDetail.meetingModeDisableConfirm'),
              style: 'destructive',
              onPress: applyMeetingModeOff,
            },
          ],
        );
        return;
      }
      applyMeetingModeOff();
      return;
    }

    void (async () => {
      await updateAiExtras(liveRecord.id, { classification: 'meeting' });
      hapticSuccess();
      promptRegenerateAfterMeetingOn();
    })();
  }, [
    aiBusy,
    applyMeetingModeOff,
    isMeetingMode,
    liveRecord,
    promptRegenerateAfterMeetingOn,
    t,
    updateAiExtras,
  ]);

  const hasRecordingMarks = (liveRecord.recordingMarks?.length ?? 0) > 0;
  const meetingPresetUiActive = useMemo(
    () => isProActive && liveRecord.classification === 'meeting',
    [isProActive, liveRecord.classification],
  );
  const showSpeakerTurnsExport = useMemo(
    () => meetingPresetUiActive && Boolean(liveRecord.meetingDialogue?.trim()),
    [meetingPresetUiActive, liveRecord.meetingDialogue],
  );

  const handleRenameSpeaker = useCallback(
    (originalLabels: string[], displayName: string) => {
      const next = renameSpeakerGroup(liveRecord.meetingSpeakerLabels, originalLabels, displayName);
      void updateAiExtras(liveRecord.id, { meetingSpeakerLabels: next ?? null });
    },
    [liveRecord.id, liveRecord.meetingSpeakerLabels, updateAiExtras],
  );

  const handleSelectMeetingSummaryTemplate = useCallback(
    (template: MeetingSummaryTemplate) => {
      void updateAiExtras(liveRecord.id, {
        meetingSummaryTemplate: template === 'general' ? null : template,
      });
    },
    [liveRecord.id, updateAiExtras],
  );

  const handleRegenerateMeetingDialogueOnly = useCallback(() => {
    regenerateMeetingDialogue(liveRecord).catch(() => {});
  }, [liveRecord, regenerateMeetingDialogue]);

  const canRegenerateMeetingDialogueOnly = useMemo(() => {
    if (!meetingPresetUiActive || !liveRecord.summary?.trim()) return false;
    if (isPrivateMode) return true;
    return Boolean(liveRecord.cloudAiJobId?.trim());
  }, [meetingPresetUiActive, isPrivateMode, liveRecord.summary, liveRecord.cloudAiJobId]);

  const detailTabs = useMemo<Tab[]>(() => {
    const row: Tab[] = ['transcript', 'summary'];
    if (meetingPresetUiActive) row.push('dialogue');
    row.push('tasks');
    return row;
  }, [meetingPresetUiActive]);

  useEffect(() => {
    if (!meetingPresetUiActive && activeTab === 'dialogue') {
      setActiveTab('summary');
      setMountedTabs((prev) => new Set([...prev, 'summary']));
    }
  }, [meetingPresetUiActive, activeTab]);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const onTogglePin = useCallback(() => togglePin(liveRecord.id), [liveRecord.id, togglePin]);
  const onAskAI = useCallback(() => {
    navigation.navigate('RecordingAskAI', { record: liveRecord });
  }, [navigation, liveRecord]);
  const onRename = useCallback(
    () => setRenameTarget({ id: liveRecord.id, title: liveRecord.title }),
    [liveRecord.id, liveRecord.title],
  );

  const renameRecordSheet = useMemo(
    () => (
      <TaskEditSheet
        visible={renameTarget !== null}
        initialText={renameTarget?.title ?? ''}
        sheetTitleKey="recordActions.renameTitle"
        placeholderKey="recordActions.renamePrompt"
        onClose={() => setRenameTarget(null)}
        onSave={({ text }) => {
          const trimmed = text.trim();
          if (!renameTarget) return false;
          if (trimmed === renameTarget.title) return true;

          void renameRecord(renameTarget.id, trimmed);

          return true;
        }}
      />
    ),
    [renameRecord, renameTarget],
  );
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

  const handleDismissMeetingDialogueError = useCallback(() => {
    setMeetingDialogueStatus(liveRecord.id, liveRecord.meetingDialogue?.trim() ? 'done' : 'idle');
    setMeetingDialogueError(liveRecord.id, undefined);
  }, [
    liveRecord.id,
    liveRecord.meetingDialogue,
    setMeetingDialogueError,
    setMeetingDialogueStatus,
  ]);
  const handleSwitchToSmartMode = useCallback(() => {
    setAiExecutionMode('smart_hybrid');
  }, [setAiExecutionMode]);

  const handleUpdateRecordingMarks = useCallback(
    (next: RecordingMark[]) => {
      void updateRecordingMarks(liveRecord.id, next);
    },
    [liveRecord.id, updateRecordingMarks],
  );

  const handleSeekToMarkMs = useCallback((ms: number) => {
    void audioPlayerRef.current?.seekToMs(ms);
  }, []);

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
  const stickyTabIndex =
    1 +
    (hasAudio && hasRecordingMarks ? 1 : 0) +
    (hasAudio ? 1 : 0) +
    (showMeetingModeToggle ? 1 : 0);

  return (
    <View className="flex-1" style={{ backgroundColor: shellBackgroundColor }}>
      <RecordingDetailHeader
        record={liveRecord}
        color={color}
        isPrivateMode={isPrivateMode}
        onBack={onBack}
        onTogglePin={onTogglePin}
        onShare={onOpenShareMenu}
        onAskAI={onAskAI}
        onRename={onRename}
        onMoveToFolder={onMoveToFolderMenu}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
        onOpenAllTasksForNote={
          (liveRecord.tasks?.length ?? 0) > 0
            ? () => navigation.navigate('AllTasks', { recordId: liveRecord.id })
            : undefined
        }
      />
      <ShareRecordSheet
        visible={shareSheetVisible}
        hasAudio={hasAudio}
        isMeeting={meetingPresetUiActive}
        showSpeakerTurnsExport={showSpeakerTurnsExport}
        isSendingEmail={emailSending}
        onClose={onCloseShareMenu}
        onShareText={handleShare}
        onEmailRecord={handleEmailRecord}
        onShareAudio={handleShareAudio}
      />
      <BlockingProgressModal
        visible={isGeneratingSharePdf && !shareSheetVisible}
        title={t('share.generatingPdfTitle')}
        description={t('share.generatingPdfDescription')}
        total={0}
      />
      {renameRecordSheet}
      {!isPrivateMode && (
        <FolderPickerSheet
          visible={folderPickerVisible}
          title={t('folders.moveToFolderTitle')}
          subtitle={t('folders.moveToFolderSubtitle')}
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
        stickyHeaderIndices={[stickyTabIndex]}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
          <RecordingDetailCard
            record={liveRecord}
            color={color}
            folderPlacement={folderPlacement}
            hideFolderPlacement={!foldersEnabled}
            surfaceBackgroundColor={tabPanelBackgroundColor}
          >
            {hasAudio ? (
              <AudioPlayer
                ref={audioPlayerRef}
                duration={liveRecord.duration}
                color={color}
                audioPath={liveRecord.audioPath}
                onPositionChange={onPositionUpdate}
                embedded
              />
            ) : null}
          </RecordingDetailCard>
        </View>

        {hasAudio && hasRecordingMarks && (
          <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
            <RecordingMarksSection
              marks={liveRecord.recordingMarks ?? []}
              color={color}
              surfaceBackgroundColor={tabPanelBackgroundColor}
              onSeekMs={handleSeekToMarkMs}
              onUpdateMarks={handleUpdateRecordingMarks}
              canEditMarks={isProActive}
            />
          </View>
        )}

        {hasAudio && (
          <View
            className="overflow-hidden rounded-2xl"
            style={{ width: '100%', maxWidth: contentMaxWidth }}
          >
            <AudioLanguageSelector
              value={recordLanguage}
              color={color}
              onSelect={setRecordLanguage}
              surfaceBackgroundColor={tabPanelBackgroundColor}
            />
          </View>
        )}

        {showMeetingModeToggle ? (
          <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
            <RecordingMeetingModeSection
              isMeetingMode={isMeetingMode}
              selectedTemplate={liveRecord.meetingSummaryTemplate ?? 'general'}
              disabled={aiBusy}
              color={color}
              surfaceBackgroundColor={tabPanelBackgroundColor}
              onToggleMeetingMode={handleToggleMeetingMode}
              onSelectTemplate={handleSelectMeetingSummaryTemplate}
            />
          </View>
        ) : null}

        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            overflow: 'hidden',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: tabPanelBackgroundColor,
          }}
        >
          <RecordingDetailTabBar
            active={activeTab}
            onSelect={onSelectTab}
            color={color}
            hasAudio={hasAudio}
            tabs={detailTabs}
          />
        </View>

        <View
          className="overflow-hidden"
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            marginTop: -12,
            backgroundColor: tabPanelBackgroundColor,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          {mountedTabs.has('transcript') && (
            <View style={activeTab !== 'transcript' ? { display: 'none' } : undefined}>
              <TranscriptContent
                record={liveRecord}
                color={color}
                currentPositionMs={currentPositionMs}
                onTranscribe={handleRetranscribe}
                onDiscardResume={handleDiscardPausedTranscription}
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
                isMeeting={meetingPresetUiActive}
                onShareMeetingBrief={onOpenShareMenu}
                onDismissError={handleDismissSummaryError}
                showPrivateModeCta={aiExecutionMode === 'private_experimental'}
                onSwitchToSmartMode={handleSwitchToSmartMode}
                onCancelProcessing={handleCancelAiGeneration}
                speakerBreakdownProcessing={
                  meetingPresetUiActive && liveRecord.meetingDialogueStatus === 'processing'
                }
                isPrivateMode={isPrivateMode}
                isPrivateCustomServer={isPrivateCustomServer}
                privateAiBatchProgress={liveRecord.privateAiBatchProgress}
                privateAiBatchPhase={liveRecord.privateAiBatchPhase}
                privateAiBatchProgressLabel={liveRecord.privateAiBatchProgressLabel}
                privateAiBatchStartedAt={liveRecord.privateAiBatchStartedAt}
                transcriptCharCount={liveRecord.transcript?.length ?? 0}
                cloudMeetingDialogueExtra={meetingPresetUiActive}
                summaryReasoning={liveRecord.summaryReasoning}
                summaryAiModel={liveRecord.summaryAiModel}
                summaryAiModelLabel={liveRecord.summaryAiModelLabel}
                summaryTokenUsage={
                  liveRecord.summaryTokensPrompt != null &&
                  liveRecord.summaryTokensCompletion != null
                    ? {
                        prompt: liveRecord.summaryTokensPrompt,
                        completion: liveRecord.summaryTokensCompletion,
                      }
                    : undefined
                }
                summaryGenerationMs={liveRecord.summaryGenerationMs}
              />
            </View>
          )}
          {mountedTabs.has('dialogue') && meetingPresetUiActive && (
            <View style={activeTab !== 'dialogue' ? { display: 'none' } : undefined}>
              <MeetingDialogueTab
                meetingDialogue={liveRecord.meetingDialogue}
                speakerLabels={liveRecord.meetingSpeakerLabels}
                onRenameSpeaker={handleRenameSpeaker}
                hasTranscript={Boolean(liveRecord.transcript)}
                hasSummary={Boolean(liveRecord.summary?.trim())}
                summaryProcessing={
                  liveRecord.summaryStatus === 'processing' ||
                  liveRecord.tasksStatus === 'processing'
                }
                color={color}
                onGenerate={handleGenerateSummary}
                onRegenerateDialogueOnly={handleRegenerateMeetingDialogueOnly}
                canRegenerateDialogueOnly={canRegenerateMeetingDialogueOnly}
                status={meetingDialogueTabStatus}
                errorMessage={liveRecord.meetingDialogueError ?? liveRecord.summaryError}
                onDismissError={handleDismissMeetingDialogueError}
                showPrivateModeCta={aiExecutionMode === 'private_experimental'}
                onCancelProcessing={handleCancelAiGeneration}
                isPrivateMode={isPrivateMode}
                isPrivateCustomServer={isPrivateCustomServer}
                privateAiBatchProgress={liveRecord.privateAiBatchProgress}
                privateAiBatchPhase={liveRecord.privateAiBatchPhase}
                privateAiBatchProgressLabel={liveRecord.privateAiBatchProgressLabel}
                privateAiBatchStartedAt={liveRecord.privateAiBatchStartedAt}
                transcriptCharCount={liveRecord.transcript?.length ?? 0}
                cloudMeetingDialogueExtra={meetingPresetUiActive}
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
                onPromoteNextStepToTask={handlePromoteNextStepToTask}
                onDeleteTask={handleDeleteTask}
                onEditTask={handleEditTask}
                onDismissError={handleDismissSummaryError}
                showPrivateModeCta={aiExecutionMode === 'private_experimental'}
                onSwitchToSmartMode={handleSwitchToSmartMode}
                onCancelProcessing={handleCancelAiGeneration}
                isPrivateMode={isPrivateMode}
                isPrivateCustomServer={isPrivateCustomServer}
                privateAiBatchProgress={liveRecord.privateAiBatchProgress}
                privateAiBatchPhase={liveRecord.privateAiBatchPhase}
                privateAiBatchProgressLabel={liveRecord.privateAiBatchProgressLabel}
                privateAiBatchStartedAt={liveRecord.privateAiBatchStartedAt}
                transcriptCharCount={liveRecord.transcript?.length ?? 0}
                cloudMeetingDialogueExtra={meetingPresetUiActive}
              />
            </View>
          )}
        </View>

        <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
          <RelatedNotesSection recordId={liveRecord.id} color={color} />
        </View>

        <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
      </KeyboardAwareScrollView>
    </View>
  );
};
