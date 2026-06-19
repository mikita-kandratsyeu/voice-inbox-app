import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { shouldReduceMotion } from '@/shared/config/animations';
import { hapticLight } from '@/shared/lib';

import { getAskAiShakeBridge } from '../lib/askAiShakeBridge';
import { addShakeListener } from '../lib/subscribeShake';

const RECORDING_ROUTE_NAMES = new Set(['RecordModal', 'TextNoteModal']);

type UseShakeGesturesOptions = {
  enabled: boolean;
};

export function useShakeGestures({ enabled }: UseShakeGesturesOptions): void {
  const { t } = useTranslation();
  const shakeToRecordEnabled = useSettingsStore((s) => s.shakeToRecordEnabled);
  const shakeToCancelAskAiEnabled = useSettingsStore((s) => s.shakeToCancelAskAiEnabled);
  const activeTranscriptionRecord = useRecordStore((s) =>
    s.records.find((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );

  const handleShake = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (shouldReduceMotion()) {
      return;
    }

    if (!getHasSeenOnboarding()) {
      return;
    }

    if (AppState.currentState !== 'active') {
      return;
    }

    const askBridge = getAskAiShakeBridge();
    if (
      askBridge.isFocused &&
      askBridge.isLoading &&
      shakeToCancelAskAiEnabled &&
      askBridge.onCancel
    ) {
      hapticLight();
      askBridge.onCancel();
      return;
    }

    if (!shakeToRecordEnabled) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (
      currentRoute &&
      (RECORDING_ROUTE_NAMES.has(currentRoute) || currentRoute === 'RecordingAskAI')
    ) {
      return;
    }

    if (hasAnyActiveTranscriptionJob()) {
      Alert.alert(
        t('record.blockedByTranscriptionTitle'),
        t('record.blockedByTranscriptionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.open'),
            onPress: () => {
              if (activeTranscriptionRecord) {
                runNavigationWhenUnlocked(() => {
                  navigationRef.navigate('RecordingDetail', { record: activeTranscriptionRecord });
                });
              }
            },
          },
        ],
      );
      return;
    }

    hapticLight();
    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('RecordModal');
    });
  }, [activeTranscriptionRecord, enabled, shakeToCancelAskAiEnabled, shakeToRecordEnabled, t]);

  useEffect(() => {
    const gesturesEnabled = enabled && (shakeToRecordEnabled || shakeToCancelAskAiEnabled);
    if (!gesturesEnabled) {
      return;
    }

    return addShakeListener(handleShake);
  }, [enabled, handleShake, shakeToCancelAskAiEnabled, shakeToRecordEnabled]);
}
