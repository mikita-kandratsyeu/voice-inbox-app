import type { TFunction } from 'i18next';
import { Apple, Cpu } from 'lucide-react-native';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

import type { TranscriptionEngine } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';

type Props = {
  color: Colors;
  t: TFunction;
  transcriptionEngine: TranscriptionEngine;
  isProActive: boolean;
  onEngineChange: (engine: TranscriptionEngine) => void;
  onProRequired: () => void;
};

export const TranscriptionEngineSection = ({
  color,
  t,
  transcriptionEngine,
  isProActive,
  onEngineChange,
  onProRequired,
}: Props) => {
  if (!IS_IOS) {
    return null;
  }

  const selectEngine = (engine: TranscriptionEngine) => {
    if (engine === 'apple_speech' && !isProActive) {
      onProRequired();
      return;
    }
    if (engine === 'apple_speech') {
      Alert.alert(
        t('settings.transcriptionEngineAppleTitle'),
        t('settings.transcriptionEngineAppleConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.transcriptionEngineAppleEnable'),
            onPress: () => onEngineChange('apple_speech'),
          },
        ],
      );
      return;
    }
    onEngineChange('whisper');
  };

  const whisperSelected = transcriptionEngine !== 'apple_speech';
  const appleSelected = transcriptionEngine === 'apple_speech';

  return (
    <View
      className="mb-6 gap-3 rounded-2xl p-4"
      style={{ backgroundColor: color.background.card }}
    >
      <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
        {t('settings.transcriptionEngineTitle')}
      </Text>
      <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
        {t('settings.transcriptionEngineSubtitle')}
      </Text>
      <View className="gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: whisperSelected }}
          className="flex-row items-center gap-3 rounded-xl border px-3 py-3"
          style={{
            borderColor: whisperSelected ? color.accent.primary : color.border.default,
            backgroundColor: whisperSelected ? color.status.processing.bg : color.background.primary,
          }}
          onPress={() => selectEngine('whisper')}
        >
          <Cpu size={20} color={color.accent.primary} strokeWidth={1.8} />
          <View className="flex-1">
            <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
              {t('settings.transcriptionEngineWhisper')}
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5" style={{ color: color.text.secondary }}>
              {t('settings.transcriptionEngineWhisperHint')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: appleSelected }}
          className="flex-row items-center gap-3 rounded-xl border px-3 py-3"
          style={{
            borderColor: appleSelected ? color.accent.primary : color.border.default,
            backgroundColor: appleSelected ? color.status.processing.bg : color.background.primary,
            opacity: isProActive ? 1 : 0.72,
          }}
          onPress={() => selectEngine('apple_speech')}
        >
          <Apple size={20} color={color.accent.cache} strokeWidth={1.8} />
          <View className="flex-1">
            <Text className="text-[15px] font-medium" style={{ color: color.text.primary }}>
              {t('settings.transcriptionEngineApple')}
              {!isProActive ? ` · ${t('settings.planStatus.proTitle')}` : ''}
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5" style={{ color: color.text.secondary }}>
              {t('settings.transcriptionEngineAppleHint')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
