import { AlertCircle, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { Button } from './Button';

export type RetryErrorStateProps = {
  color: Colors;
  title?: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  retryDisabled?: boolean;
  actionSlot?: React.ReactNode;
};

export function RetryErrorState({
  color,
  title,
  message,
  retryLabel,
  onRetry,
  retryDisabled = false,
  actionSlot,
}: RetryErrorStateProps) {
  const compactActions = Boolean(actionSlot);
  const retryButton = (
    <Button
      variant="primary"
      size={compactActions ? 'md' : 'lg'}
      icon={<RefreshCw size={compactActions ? 16 : 18} color="#fff" strokeWidth={2} />}
      label={retryLabel}
      color={color}
      onPress={onRetry}
      disabled={retryDisabled}
      containerStyle={compactActions ? { flex: 1, minWidth: 0 } : undefined}
      accessibilityLabel={retryLabel}
    />
  );

  return (
    <View className="w-full items-center gap-4 px-1 py-4">
      <AlertCircle size={40} color={color.accent.delete} strokeWidth={1.8} />
      {title ? (
        <Text className="text-center text-base font-semibold" style={{ color: color.text.primary }}>
          {title}
        </Text>
      ) : null}
      <Text className="text-center text-[15px] leading-6" style={{ color: color.text.secondary }}>
        {message}
      </Text>
      {actionSlot ? (
        <View className="w-full flex-row gap-2" style={{ maxWidth: 440 }}>
          {retryButton}
          {actionSlot}
        </View>
      ) : (
        retryButton
      )}
    </View>
  );
}
