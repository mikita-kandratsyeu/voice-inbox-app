import { AlertCircle, CheckCircle2, Loader, MicOff } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';

import { getColors } from '@/shared/config';

import type { RecordingStatus } from '../model/types';

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  onPress: () => void;
};

export const AiStatusPill = ({ aiStatus, onPress }: AiStatusPillProps) => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  if (aiStatus === 'done') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <CheckCircle2 size={20} color={color.status.success} strokeWidth={2} />
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'processing') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Loader size={11} color={color.status.processing.text} strokeWidth={2.5} />
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {t('aiStatus.processing')}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.error.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color={color.status.error.text} strokeWidth={2.5} />
        <Text className="text-xs font-medium" style={{ color: color.status.error.text }}>
          {t('common.error')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: color.status.muted.bg }}
    >
      <MicOff size={11} color={color.status.muted.text} strokeWidth={2.5} />
      <Text className="text-xs font-medium" style={{ color: color.status.muted.text }}>
        {t('aiStatus.noTranscript')}
      </Text>
    </View>
  );
};
