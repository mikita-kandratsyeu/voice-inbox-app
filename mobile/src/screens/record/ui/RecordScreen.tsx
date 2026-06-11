import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, StatusBar, View } from 'react-native';
import KeepAwake from 'react-native-keep-awake';

import type { RootStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import type { RecordingMark, RecordingMarkKind, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import {
  computeAdsAllowedForInterstitial,
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
import { useRecordingAudioRouteHint } from '../lib/useRecordingAudioRouteHint';
import { useRecording } from '../model/useRecording';
import { AddRecordingMarkSheet } from './AddRecordingMarkSheet';
import { RecordDurationLimit } from './RecordDurationLimit';
import { RecordLimitBar } from './RecordLimitBar';
import { RecordOfflineStatusCard } from './RecordOfflineStatusCard';
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
    s.records.find(
      (r) =>
        r.aiStatus === 'loading_model' ||
        r.aiStatus === 'processing' ||
        r.aiStatus === 'cancelling',
    ),
  );
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const maxRecordingMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode, privateAiProvider),
    [isProActive, aiExecutionMode, privateAiProvider],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(autoTranscribeOnSave, isProActive);
  const { startTranscription } = useTranscription();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalReason, setSaveModalReason] = useState<'user' | 'limit' | 'deeplink'>('user');
  const requestShowSaveModal = useRecordingDeeplinkStore((s) => s.requestShowSaveModal);
  const setRequestShowSaveModal = useRecordingDeeplinkStore((s) => s.setRequestShowSaveModal);
  const pauseResumeRequestTick = useRecordingDeeplinkStore((s) => s.pauseResumeRequestTick);
  const handledPauseResumeTickRef = useRef(0);
  const [title, setTitle] = useState('');
  const [recordingMarks, setRecordingMarks] = useState<RecordingMark[]>([]);
  const [markSheetVisible, setMarkSheetVisible] = useState(false);
  const [markSheetOpenId, setMarkSheetOpenId] = useState(0);
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
    audioLevelShared,
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
      setMarkSheetVisible(false);
      setTitle('');
      setSaveModalReason('limit');
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
      setMarkSheetVisible(false);
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

  const elapsedMsRef = useRef(elapsedMs);
  elapsedMsRef.current = elapsedMs;

  const routeChangeHintVisible = useRecordingAudioRouteHint(state === 'recording');
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
      setMarkSheetVisible(false);
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
    setMarkSheetVisible(false);
    setTitle('');
    setSaveModalReason('user');
    setShowSaveModal(true);
  };

  const appendRecordingMark = useCallback(
    (kind: RecordingMarkKind, label: string, offsetMs?: number) => {
      setRecordingMarks((prev) => [
        ...prev,
        {
          id: generateRecordingMarkId(),
          offsetMs: Math.round(offsetMs ?? elapsedMsRef.current),
          kind,
          label,
        },
      ]);
    },
    [],
  );

  const handleAddMarkPress = useCallback(() => {
    if (showSaveModal) return;

    const offsetMs = Math.round(elapsedMsRef.current);

    if (markSheetVisible) {
      setMarkSheetVisible(false);
      setMarkSheetOpenId((id) => id + 1);
      requestAnimationFrame(() => {
        setMarkSnapshotOffsetMs(offsetMs);
        setMarkSheetVisible(true);
      });
      return;
    }

    setMarkSnapshotOffsetMs(offsetMs);
    setMarkSheetOpenId((id) => id + 1);
    setMarkSheetVisible(true);
  }, [showSaveModal, markSheetVisible]);

  const handleMarkSheetClose = () => {
    setMarkSheetVisible(false);
  };

  const handleMarkSave = (kind: RecordingMarkKind, label: string) => {
    appendRecordingMark(kind, label, markSnapshotOffsetMs);
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
    const adsAllowed = computeAdsAllowedForInterstitial(isProActive);
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
          <View
            style={{
              shadowColor: '#ffffff',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: state === 'recording' ? 0.3 : 0,
              shadowRadius: 12,
            }}
          >
            <Waveform
              isAnimating={state === 'recording' && appState === 'active'}
              color="rgba(255,255,255,0.65)"
              inputLevel={audioLevelShared}
              liveMetering={state === 'recording'}
            />
          </View>
        </View>
        <View
          className="w-full items-center px-2"
          style={isProActive ? { paddingBottom: 32 } : undefined}
        >
          <RecordOfflineStatusCard
            title={
              routeChangeHintVisible ? t('record.routeChangeHintTitle') : t('record.offlineHint')
            }
            subtitle={
              routeChangeHintVisible
                ? t('record.routeChangeHintSubtitle')
                : isAppLockEnabled
                  ? t('record.appLockHint')
                  : t('record.noAppLockHint')
            }
            marksHint={
              isProActive && recordingMarks.length > 0 && !routeChangeHintVisible
                ? t('record.saveModalMarksHint', { count: recordingMarks.length })
                : null
            }
            hidden={state === 'paused'}
          />
        </View>
      </View>
      <RecordScreenControls
        state={state}
        onPauseResume={handlePauseResume}
        onAddMark={handleAddMarkPress}
        onDonePress={handleDonePress}
        showPinMomentButton={isProActive}
      />
      {markSheetVisible ? (
        <AddRecordingMarkSheet
          key={`mark-sheet-${markSheetOpenId}`}
          visible
          snapshotOffsetMs={markSnapshotOffsetMs}
          onClose={handleMarkSheetClose}
          onSave={handleMarkSave}
        />
      ) : null}
      {showSaveModal ? (
        <SaveRecordModal
          visible
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
      ) : null}
    </View>
  );
};
