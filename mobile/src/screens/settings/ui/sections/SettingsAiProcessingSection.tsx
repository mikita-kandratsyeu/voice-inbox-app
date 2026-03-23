import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Bot, Mic, RefreshCw, Settings2 } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  aiModelName: string;
  transcriptionValue: string;
  embeddingAvailable: boolean;
  isUpdatingEmbeddings: boolean;
  onUpdateEmbeddings: () => void;
};

export const SettingsAiProcessingSection = ({
  color,
  t,
  navigation,
  aiModelName,
  transcriptionValue,
  embeddingAvailable,
  isUpdatingEmbeddings,
  onUpdateEmbeddings,
}: Props) => (
  <SettingsSection title={t('settings.aiProcessing')}>
    <SettingsRow
      label={t('settings.aiModel')}
      value={aiModelName}
      leftIcon={<Bot size={20} color={color.accent.transcript} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('AIModelPicker')}
      isFirst
    />
    <SettingsRow
      label={t('settings.transcription')}
      value={transcriptionValue}
      leftIcon={<Mic size={20} color={color.accent.cache} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('WhisperModelPicker')}
    />
    <SettingsRow
      label={t('settings.aiSettings')}
      leftIcon={<Settings2 size={20} color={color.accent.transcript} strokeWidth={1.8} />}
      onPress={() => navigation.navigate('AiSettings')}
      isLast={!embeddingAvailable}
    />
    {embeddingAvailable && (
      <SettingsRow
        label={
          isUpdatingEmbeddings ? t('settings.updatingEmbeddings') : t('settings.updateEmbeddings')
        }
        leftIcon={<RefreshCw size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={isUpdatingEmbeddings ? undefined : onUpdateEmbeddings}
        isLast
      />
    )}
  </SettingsSection>
);
