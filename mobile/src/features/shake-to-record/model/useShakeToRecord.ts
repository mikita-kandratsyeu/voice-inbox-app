import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import { navigationRef } from '@/app/navigation/navigationRef';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { hasAnyActiveTranscriptionJob } from '@/features/transcription/model/transcriptionJobRegistry';
import { hapticLight } from '@/shared/lib';

import { subscribeShake } from '../lib/subscribeShake';

const BLOCKED_SHAKE_ROUTES = new Set(['RecordModal', 'TextNoteModal', 'RecordingAskAI']);

type UseShakeToRecordOptions = {
  enabled: boolean;
};

export function useShakeToRecord({ enabled }: UseShakeToRecordOptions): void {
  const { t } = useTranslation();
  const shakeToRecordEnabled = useSettingsStore((s) => s.shakeToRecordEnabled);
  const activeTranscriptionRecord = useRecordStore((s) =>
    s.records.find((r) => r.aiStatus === 'loading_model' || r.aiStatus === 'processing'),
  );

  const handleShake = useCallback(() => {
    if (!enabled || !shakeToRecordEnabled) {
      return;
    }

    if (!getHasSeenOnboarding()) {
      return;
    }

    if (AppState.currentState !== 'active') {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute && BLOCKED_SHAKE_ROUTES.has(currentRoute)) {
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
  }, [activeTranscriptionRecord, enabled, shakeToRecordEnabled, t]);

  useEffect(() => {
    if (!enabled || !shakeToRecordEnabled) {
      return;
    }

    return subscribeShake(handleShake);
  }, [enabled, handleShake, shakeToRecordEnabled]);
}
