import { SlidersHorizontal } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { useSettingsStore } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { WhisperSegmentedControl } from './WhisperSegmentedControl';

type WhisperWeightsFormatSectionProps = {
  color: Colors;
  embedded?: boolean;
  hasActiveWhisperDownload: boolean;
};

export const WhisperWeightsFormatSection = ({
  color,
  embedded = false,
  hasActiveWhisperDownload,
}: WhisperWeightsFormatSectionProps) => {
  const { t } = useTranslation();
  const whisperModelWeightsFormat = useSettingsStore((s) => s.whisperModelWeightsFormat);
  const setWhisperModelWeightsFormat = useSettingsStore((s) => s.setWhisperModelWeightsFormat);

  const content = (
    <>
      {!embedded ? (
        <View className="mb-2 flex-row items-center gap-2">
          <SlidersHorizontal size={18} color={color.icon.muted} strokeWidth={2} />
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
            {t('whisper.weightsFormatTitle')}
          </Text>
        </View>
      ) : null}
      <WhisperSegmentedControl
        value={whisperModelWeightsFormat}
        options={[
          { value: 'q5_1', label: t('whisper.weightsFormatQ5') },
          { value: 'full', label: t('whisper.weightsFormatFull') },
        ]}
        onChange={(format) => {
          if (format === whisperModelWeightsFormat) {
            return;
          }
          if (hasActiveWhisperDownload) {
            Alert.alert(
              t('whisper.weightsFormatChangeBlockedTitle'),
              t('whisper.weightsFormatChangeBlockedBody'),
            );
            return;
          }
          setWhisperModelWeightsFormat(format);
        }}
        color={color}
        accessibilityLabel={t('whisper.weightsFormatTitle')}
      />
      <Text className="mt-2.5 text-xs leading-4" style={{ color: color.text.muted }}>
        {whisperModelWeightsFormat === 'q5_1'
          ? t('whisper.weightsFormatQ5Hint')
          : t('whisper.weightsFormatFullHint')}
      </Text>
    </>
  );

  if (embedded) {
    return (
      <View className="border-b px-4 py-3.5" style={{ borderBottomColor: color.border.default }}>
        {content}
      </View>
    );
  }

  return (
    <View className="mb-6 gap-2 rounded-2xl p-4" style={{ backgroundColor: color.background.card }}>
      {content}
    </View>
  );
};
