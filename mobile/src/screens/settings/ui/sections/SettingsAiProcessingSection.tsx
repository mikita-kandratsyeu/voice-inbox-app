import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Bot, Cpu, Mic, RefreshCw, Settings2 } from 'lucide-react-native';
import React from 'react';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  navigation: NativeStackNavigationProp<SettingsStackParamList>;
  privateAiModeValue: string;
  aiModelName?: string;
  aiModelLockedByPrivateRemote: boolean;
  transcriptionValue: string;
  embeddingAvailable: boolean;
  isUpdatingEmbeddings: boolean;
  onUpdateEmbeddings: () => void;
};

export const SettingsAiProcessingSection = ({
  color,
  t,
  navigation,
  privateAiModeValue,
  aiModelName,
  aiModelLockedByPrivateRemote,
  transcriptionValue,
  embeddingAvailable,
  isUpdatingEmbeddings,
  onUpdateEmbeddings,
}: Props) => {
  const aiSettingsIsLast = !embeddingAvailable;

  return (
    <SettingsSection title={t('settings.aiProcessing')}>
      <SettingsRow
        label={t('settings.privateAiMode')}
        value={privateAiModeValue}
        leftIcon={<Cpu size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={() => navigation.navigate('PrivateAiMode')}
        isFirst
      />
      <SettingsRow
        label={t('settings.aiModel')}
        value={aiModelName?.trim() ? aiModelName : undefined}
        leftIcon={<Bot size={20} color={color.accent.transcript} strokeWidth={1.8} />}
        onPress={
          aiModelLockedByPrivateRemote
            ? () => navigation.navigate('AiSettings')
            : () => navigation.navigate('AIModelPicker')
        }
        showChevron
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
        isLast={aiSettingsIsLast}
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
};
