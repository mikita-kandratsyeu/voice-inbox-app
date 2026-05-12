import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, StatusBar, Text, View } from 'react-native';
import KeepAwake from 'react-native-keep-awake';

import type { RootStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import type { RecordingMark, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import {
  getMaxRecordingMsForTier,
  shouldApplyAutoTranscribeOnSave,
} from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';
import { useRecordingDeeplinkStore } from '@/features/recording-deeplink/model/store';
import { useTranscription } from '@/features/transcription';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import {
  runAfterNavigationTransition,
  tryShowYandexInterstitial,
} from '@/features/yandex-interstitial';
import { useColors } from '@/shared/config';
import { formatTime, persistRecordingToDocuments } from '@/shared/lib';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { Waveform } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { generateRecordingMarkId } from '../lib/generateRecordingMarkId';
import { getAutoTitle } from '../lib/getAutoTitle';
import { useRecording } from '../model/useRecording';
import { AddRecordingMarkSheet } from './AddRecordingMarkSheet';
import { RecordDurationLimit } from './RecordDurationLimit';
import { RecordLimitBar } from './RecordLimitBar';
import { RecordScreenControls } from './RecordScreenControls';
import { RecordScreenHeader } from './RecordScreenHeader';
import { RecordTimer } from './RecordTimer';
import { SaveRecordModal } from './SaveRecordModal';

export const RecordScreen = () => {
  const { t } = useTranslation();
  const c = useColors();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const activeTranscriptionRecord = useRecordStore((s) =>
    s.records.find((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const { isProActive } = useProEntitlement();
  const maxRecordingMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode),
    [isProActive, aiExecutionMode],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(autoTranscribeOnSave, isProActive);
  const { startTranscription } = useTranscription();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalReason, setSaveModalReason] = useState<
    'user' | 'limit' | 'routeChange' | 'deeplink'
  >('user');
  const requestShowSaveModal = useRecordingDeeplinkStore((s) => s.requestShowSaveModal);
  const setRequestShowSaveModal = useRecordingDeeplinkStore((s) => s.setRequestShowSaveModal);
  const pauseResumeRequestTick = useRecordingDeeplinkStore((s) => s.pauseResumeRequestTick);
  const handledPauseResumeTickRef = useRef(0);
  const [title, setTitle] = useState('');
  const [recordingMarks, setRecordingMarks] = useState<RecordingMark[]>([]);
  const [markSheetVisible, setMarkSheetVisible] = useState(false);
  const [markSnapshotOffsetMs, setMarkSnapshotOffsetMs] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  const {
    state,
    elapsed,
    elapsedMs,
    audioPathRef,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  } = useRecording({
    maxRecordingMs,
    onLimitReached: () => {
      void logAnalyticsEvent('recording_limit_hit');
      setTitle('');
      setSaveModalReason('limit');
      setShowSaveModal(true);
    },
    onAudioRouteChange: () => {
      setTitle('');
      setSaveModalReason('routeChange');
      setShowSaveModal(true);
    },
    onRecordingStoppedByAppLock: (path, elapsed, elapsedMs) => {
      const recordId = generateRecordId();
      const resolvedPath = path.startsWith('file://') ? path.slice(7) : path;
      const autoTitle = getAutoTitle();

      const addRecordWithPath = (audioPath: string) => {
        const record: VoiceRecord = {
          id: recordId,
          title: autoTitle,
          transcript: '',
          transcriptSegments: [],
          summary: '',
          tasks: [],
          duration: formatTime(elapsed),
          durationMs: Math.round(elapsedMs),
          createdAt: dayjs().toISOString(),
          status: 'unread',
          aiStatus: 'idle',
          transcriptProgress: 0,
          isPinned: false,
          tags: [],
          recordingMarks: [],
          audioPath,
        };

        useRecordStore.getState().addRecord(record);

        const persist = useSettingsStore.getState().autoTranscribeOnSave;
        if (shouldApplyAutoTranscribeOnSave(persist, isProActive)) {
          startTranscription(record);
        }
      };

      persistRecordingToDocuments(resolvedPath, recordId)
        .then(addRecordWithPath)
        .catch(() => addRecordWithPath(resolvedPath));
    },
  });

  useEffect(() => {
    if (requestShowSaveModal && (state === 'recording' || state === 'paused')) {
      setTitle('');
      setSaveModalReason('deeplink');
      setShowSaveModal(true);
      setRequestShowSaveModal(false);
    }
  }, [requestShowSaveModal, state, setRequestShowSaveModal]);

  useEffect(() => {
    if (pauseResumeRequestTick === handledPauseResumeTickRef.current) {
      return;
    }

    handledPauseResumeTickRef.current = pauseResumeRequestTick;

    if (state === 'recording') {
      pauseRecording();
    } else if (state === 'paused') {
      resumeRecording();
    }
  }, [pauseResumeRequestTick, state, pauseRecording, resumeRecording]);

  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);

  useFocusEffect(
    useCallback(() => {
      if (state === 'idle') {
        if (hasAnyActiveTranscriptionJob()) {
          Alert.alert(
            t('record.blockedByTranscriptionTitle'),
            t('record.blockedByTranscriptionMessage'),
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
              {
                text: t('common.open'),
                onPress: () => {
                  if (activeTranscriptionRecord) {
                    navigation.replace('RecordingDetail', { record: activeTranscriptionRecord });
                  } else {
                    navigation.goBack();
                  }
                },
              },
            ],
          );
          return;
        }
        startRecording();
      }
    }, [state, startRecording, t, navigation, activeTranscriptionRecord]),
  );

  const handleClose = async () => {
    if (showSaveModal) {
      return;
    }
    if (state === 'recording' || state === 'paused') {
      await pauseRecording();
      setTitle('');
      setSaveModalReason('user');
      setShowSaveModal(true);
      return;
    }
    navigation.goBack();
  };

  const handlePauseResume = () => {
    if (state === 'recording') {
      pauseRecording();
    } else if (state === 'paused') {
      resumeRecording();
    }
  };

  const handleDonePress = async () => {
    await pauseRecording();
    setTitle('');
    setSaveModalReason('user');
    setShowSaveModal(true);
  };

  const handleAddMarkPress = () => {
    setMarkSnapshotOffsetMs(Math.round(elapsedMs));
    setMarkSheetVisible(true);
  };

  const handleMarkSheetClose = () => {
    setMarkSheetVisible(false);
  };

  const handleMarkLabelSave = (label: string) => {
    setRecordingMarks((prev) => [
      ...prev,
      {
        id: generateRecordingMarkId(),
        offsetMs: markSnapshotOffsetMs,
        label,
      },
    ]);
    setMarkSheetVisible(false);
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
    if (saveModalReason === 'user') {
      resumeRecording();
    }
  };

  const handleSaveConfirm = async (record: VoiceRecord) => {
    const path = await stopRecording();

    let audioPath = record.audioPath;

    if (path) {
      const resolvedPath = path.startsWith('file://') ? path.slice(7) : path;
      try {
        audioPath = await persistRecordingToDocuments(resolvedPath, record.id);
      } catch {
        audioPath = resolvedPath;
      }
    }
    const recordWithPath: VoiceRecord = { ...record, audioPath };
    addRecord(recordWithPath);
    if (applyAutoTranscribe) {
      startTranscription(recordWithPath);
    }
  };

  const handleSaveComplete = () => {
    setShowSaveModal(false);
    navigation.goBack();
    const adsAllowed = !isProActive;
    runAfterNavigationTransition(() => {
      void tryShowYandexInterstitial({ adsAllowed, trigger: 'after_note_create' });
    });
  };

  const handleSaveModalDiscard = async () => {
    await discardRecording();
    setShowSaveModal(false);
    navigation.goBack();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: c.accent.primary }}>
      {state === 'recording' && <KeepAwake />}
      <StatusBar barStyle="light-content" backgroundColor={c.accent.primary} />
      <RecordScreenHeader state={state} onClose={handleClose} />
      <View className="flex-1 items-center justify-center gap-9 px-6">
        <View className="items-center gap-3">
          <RecordTimer elapsedMs={elapsedMs} />
          <RecordDurationLimit elapsedMs={elapsedMs} maxRecordingMs={maxRecordingMs} />
          <RecordLimitBar elapsedMs={elapsedMs} maxRecordingMs={maxRecordingMs} />
        </View>
        <View className="w-full px-2">
          <Waveform
            isAnimating={state === 'recording' && appState === 'active'}
            color="rgba(255,255,255,0.58)"
          />
        </View>
        <View className="items-center gap-1" style={{ opacity: state === 'paused' ? 0 : 1 }}>
          <Text className="text-[16px] font-medium text-white/90">{t('record.offlineHint')}</Text>
          <Text className="text-[13px] text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {isAppLockEnabled ? t('record.appLockHint') : t('record.noAppLockHint')}
          </Text>
        </View>
      </View>
      <RecordScreenControls
        state={state}
        onPauseResume={handlePauseResume}
        onAddMark={handleAddMarkPress}
        onDonePress={handleDonePress}
        showPinMomentButton={isProActive}
      />
      <AddRecordingMarkSheet
        visible={markSheetVisible}
        snapshotOffsetMs={markSnapshotOffsetMs}
        onClose={handleMarkSheetClose}
        onSave={handleMarkLabelSave}
      />
      <SaveRecordModal
        visible={showSaveModal}
        title={title}
        elapsed={elapsed}
        elapsedMs={elapsedMs}
        audioPath={audioPathRef.current}
        recordingMarks={recordingMarks}
        onTitleChange={setTitle}
        onCancel={handleSaveCancel}
        onSave={handleSaveConfirm}
        onSaveComplete={handleSaveComplete}
        onDiscard={handleSaveModalDiscard}
        allowResume={saveModalReason === 'user'}
        contextHint={saveModalReason === 'limit' ? t('record.saveAfterLimitHint') : null}
      />
    </View>
  );
};
