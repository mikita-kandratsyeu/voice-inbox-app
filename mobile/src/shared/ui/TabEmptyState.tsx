import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

import { isString } from '../lib';
import { Button } from './Button';

type TabEmptyStateProps = {
  buttonIcon?: React.ReactNode;
  buttonLabel?: string;
  description: string;
  disabled?: boolean;
  extraHint?: string;
  hideButton?: boolean;
  hint?: string;
  hintIcon?: React.ReactNode;
  icon: React.ReactNode;
  onPress?: () => void;
  title: string;
};

export const TabEmptyState = ({
  buttonIcon,
  buttonLabel,
  description,
  disabled = false,
  extraHint,
  hideButton = false,
  hint,
  hintIcon,
  icon,
  onPress,
  title,
}: TabEmptyStateProps) => {
  const color = useColors();
  return (
    <View className="items-center gap-3 px-6 pb-8 pt-10">
      <View
        className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{ backgroundColor: color.background.tertiary }}
      >
        {icon}
      </View>
      <Text
        className="text-center text-[18px] font-bold tracking-tight"
        style={{ color: color.text.primary }}
      >
        {title}
      </Text>
      {!hideButton && buttonLabel && onPress && (
        <>
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
        </>
      )}
      {hint !== undefined && (
        <View className="flex-col items-center gap-1">
          <View className="flex-row items-center gap-1">
            {hintIcon ?? null}
            <Text className="text-xs" style={{ color: color.text.secondary }}>
              {hint}
            </Text>
          </View>
          {isString(extraHint) && extraHint.length > 0 && (
            <Text className="text-xs text-center" style={{ color: color.text.secondary }}>
              {extraHint}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
