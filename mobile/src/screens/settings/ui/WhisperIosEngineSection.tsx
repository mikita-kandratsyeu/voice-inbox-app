import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Text, TouchableOpacity, View } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import { openPlanPaywall } from '@/features/plan-paywall';
import { useProEntitlement } from '@/features/pro-license';
import { IOS_WHISPERKIT_ROLLOUT_ENABLED } from '@/features/transcription/config/transcriptionEngine';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { hapticSelection } from '@/shared/lib';
import { ProCrownBadge } from '@/shared/ui';

type WhisperIosEngineSectionProps = {
  color: Colors;
};

export const WhisperIosEngineSection = ({ color }: WhisperIosEngineSectionProps) => {
  const { t } = useTranslation();
  const { isProActive } = useProEntitlement();
  const iosWhisperKitEngineEnabled = useSettingsStore((s) => s.iosWhisperKitEngineEnabled);
  const transcriptionDiarizationEnabled = useSettingsStore((s) => s.transcriptionDiarizationEnabled);
  const setIosWhisperKitEngineEnabled = useSettingsStore((s) => s.setIosWhisperKitEngineEnabled);
  const setTranscriptionDiarizationEnabled = useSettingsStore(
    (s) => s.setTranscriptionDiarizationEnabled,
  );

  if (!IS_IOS || !IOS_WHISPERKIT_ROLLOUT_ENABLED) {
    return null;
  }

  const handleDiarizationToggle = (value: boolean): void => {
    if (!isProActive) {
      openPlanPaywall();
      return;
    }
    hapticSelection();
    setTranscriptionDiarizationEnabled(value);
  };

  return (
    <View className="mb-6 gap-4 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
            {t('whisper.iosEngineTitle')}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: color.text.muted }}>
            {t('whisper.iosEngineHint')}
          </Text>
        </View>
        <Switch
          value={iosWhisperKitEngineEnabled}
          onValueChange={(value) => {
            hapticSelection();
            setIosWhisperKitEngineEnabled(value);
          }}
          trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
        />
      </View>

      {iosWhisperKitEngineEnabled ? (
        <TouchableOpacity
          activeOpacity={isProActive ? 1 : 0.7}
          onPress={() => {
            if (!isProActive) {
              openPlanPaywall();
            }
          }}
          accessibilityRole="switch"
          accessibilityState={{
            checked: isProActive && transcriptionDiarizationEnabled,
            disabled: !isProActive,
          }}
          accessibilityLabel={t('whisper.diarizationTitle')}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
                  {t('whisper.diarizationTitle')}
                </Text>
                {!isProActive ? <ProCrownBadge /> : null}
              </View>
              <Text className="mt-1 text-xs" style={{ color: color.text.muted }}>
                {t('whisper.diarizationHint')}
              </Text>
            </View>
            <Switch
              value={isProActive && transcriptionDiarizationEnabled}
              onValueChange={handleDiarizationToggle}
              disabled={!isProActive}
              trackColor={{ false: color.background.tertiary, true: color.accent.primary }}
            />
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
