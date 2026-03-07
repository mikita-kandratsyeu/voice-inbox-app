import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { Button } from './Button';

type TabEmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  hint: string;
  hintIcon?: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
  color: Colors;
};

export const TabEmptyState = ({
  icon,
  title,
  description,
  buttonLabel,
  buttonIcon,
  hint,
  hintIcon,
  disabled = false,
  onPress,
  color,
}: TabEmptyStateProps) => (
  <View className="items-center gap-3 px-6 pb-8 pt-10">
    <View
      className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full"
      style={{ backgroundColor: color.background.tertiary }}
    >
      {icon}
    </View>
    <Text
      className="text-center text-[17px] font-bold tracking-tight"
      style={{ color: color.text.primary }}
    >
      {title}
    </Text>
    <Text className="text-center text-sm leading-5" style={{ color: color.text.secondary }}>
      {description}
    </Text>
    <Button
      variant="primary"
      size="lg"
      icon={buttonIcon}
      label={buttonLabel}
      color={color}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      className="mt-2"
    />
    <View className="flex-row items-center gap-1">
      {hintIcon ?? null}
      <Text className="text-xs" style={{ color: color.text.secondary }}>
        {hint}
      </Text>
    </View>
  </View>
);
