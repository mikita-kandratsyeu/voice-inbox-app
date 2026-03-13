import { useFocusEffect, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StatusBar, Text, View } from 'react-native';
import KeepAwake from 'react-native-keep-awake';

import { useAppLockStore } from '@/entities/app-lock';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useTranscription } from '@/features/transcription';
import { getColors, useAppTheme } from '@/shared/config';
import { formatTime, i18n } from '@/shared/lib';
import { Waveform } from '@/shared/ui';

import { generateRecordId } from '../lib/generateRecordId';
import { useRecording } from '../model/useRecording';
import { RecordLimitBar } from './RecordLimitBar';
import { RecordScreenControls } from './RecordScreenControls';
import { RecordScreenHeader } from './RecordScreenHeader';
import { RecordTimer } from './RecordTimer';
import { SaveRecordModal } from './SaveRecordModal';

export const RecordScreen = () => {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const c = getColors(scheme);

  const navigation = useNavigation();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const { startTranscription } = useTranscription();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [title, setTitle] = useState('');
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
  } = useRecording({
    onLimitReached: () => {
      setTitle('');
      setShowSaveModal(true);
    },
    onRecordingStoppedByAppLock: (path, elapsed, elapsedMs) => {
      const record: VoiceRecord = {
        id: generateRecordId(),
        title: i18n.t('record.newRecord'),
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
        audioPath: path.startsWith('file://') ? path.slice(7) : path,
      };
      useRecordStore.getState().addRecord(record);
      if (useSettingsStore.getState().autoTranscribeOnSave) {
        startTranscription(record);
      }
    },
  });

  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);

  useFocusEffect(
    useCallback(() => {
      if (state === 'idle') {
        startRecording();
      }
    }, [state, startRecording]),
  );

  const handleClose = async () => {
    await stopRecording();
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
    setShowSaveModal(true);
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
    resumeRecording();
  };

  const handleSaveConfirm = async (record: VoiceRecord) => {
    await stopRecording();
    addRecord(record);
    if (autoTranscribeOnSave) {
      startTranscription(record);
    }
  };

  const handleSaveComplete = () => {
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
          <RecordLimitBar elapsedMs={elapsedMs} />
        </View>
        <View className="w-full px-2">
          <Waveform
            isAnimating={state === 'recording' && appState === 'active'}
            color="rgba(255,255,255,0.65)"
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
        onDonePress={handleDonePress}
      />
      <SaveRecordModal
        visible={showSaveModal}
        title={title}
        elapsed={elapsed}
        elapsedMs={elapsedMs}
        audioPath={audioPathRef.current}
        onTitleChange={setTitle}
        onCancel={handleSaveCancel}
        onSave={handleSaveConfirm}
        onSaveComplete={handleSaveComplete}
      />
    </View>
  );
};
