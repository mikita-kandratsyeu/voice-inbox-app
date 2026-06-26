import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { WhisperSegmentedControl } from './WhisperSegmentedControl';

type WhisperEngineMode = 'standard' | 'improved';

type WhisperEngineModeSectionProps = {
  color: Colors;
  embedded?: boolean;
};

export const WhisperEngineModeSection = ({
  color,
  embedded = false,
}: WhisperEngineModeSectionProps) => {
  const { t } = useTranslation();
  const iosWhisperKitEngineEnabled = useSettingsStore((s) => s.iosWhisperKitEngineEnabled);
  const setIosWhisperKitEngineEnabled = useSettingsStore((s) => s.setIosWhisperKitEngineEnabled);

  const mode: WhisperEngineMode = iosWhisperKitEngineEnabled ? 'improved' : 'standard';

  const content = (
    <>
      <WhisperSegmentedControl
        value={mode}
        options={[
          { value: 'standard', label: t('whisper.engineMode.standard') },
          { value: 'improved', label: t('whisper.engineMode.improved') },
        ]}
        onChange={(next) => setIosWhisperKitEngineEnabled(next === 'improved')}
        color={color}
        accessibilityLabel={t('whisper.sectionEngine')}
      />
      <Text className="mt-2.5 text-xs leading-4" style={{ color: color.text.muted }}>
        {mode === 'improved'
          ? t('whisper.engineModeHint.improved')
          : t('whisper.engineModeHint.standard')}
      </Text>
    </>
  );

  if (embedded) {
    return <View className="px-4 py-3.5">{content}</View>;
  }

  return (
    <View className="mb-6 gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      {content}
    </View>
  );
};
