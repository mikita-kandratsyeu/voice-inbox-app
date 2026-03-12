import { AlertCircle, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type AiTabErrorBannerProps = {
  message: string;
  color: Colors;
  onDismiss: () => void;
};

export const AiTabErrorBanner = ({ message, color, onDismiss }: AiTabErrorBannerProps) => {
  const { t } = useTranslation();

  return (
    <View
      className="mb-2 flex-row items-center gap-2 rounded-xl p-3"
      style={{ backgroundColor: color.background.tertiary }}
    >
      <AlertCircle size={20} color={color.accent.delete} strokeWidth={1.8} />
      <Text className="flex-1 text-sm" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        className="p-1"
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
      >
        <X size={20} color={color.text.secondary} strokeWidth={2} />
      </Pressable>
    </View>
  );
};
