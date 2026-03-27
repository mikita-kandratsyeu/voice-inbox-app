import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useColors } from '@/shared/config';

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
  const label = cancelLabel ?? t('common.cancel');

  return (
    <View className="items-center gap-3 p-8">
      <ActivityIndicator color={color.accent.primary} />
      <Text className="text-sm text-center" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      {showCancelButton && onCancel ? (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="mt-1 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text className="text-sm font-medium" style={{ color: color.text.primary }}>
            {label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};
