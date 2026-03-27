import { X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

import { Button } from './Button';

type AiTabLoadingStateProps = {
  message: string;
  showCancelButton?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
};

export const AiTabLoadingState = ({
  message,
  showCancelButton = false,
  onCancel,
  cancelLabel,
}: AiTabLoadingStateProps) => {
  const color = useColors();
  const { t } = useTranslation();
  const label = cancelLabel ?? t('recordingDetail.cancel');

  return (
    <View className="items-center gap-3 p-8">
      <ActivityIndicator color={color.accent.primary} />
      <Text className="text-sm text-center" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      {showCancelButton && onCancel ? (
        <Button
          variant="secondary"
          size="lg"
          icon={<X size={16} color={color.text.primary} strokeWidth={2.5} />}
          label={label}
          color={color}
          onPress={onCancel}
          className="mt-1"
        />
      ) : null}
    </View>
  );
};
