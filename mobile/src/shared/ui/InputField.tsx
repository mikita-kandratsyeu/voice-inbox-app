import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';

import { IS_ANDROID, IS_IOS } from '../lib';

export type InputFieldProps = {
  color: Colors;
  hasValue?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

const CONTAINER_BASE = {
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 14,
  flexDirection: 'row' as const,
  gap: 8,
};

const IOS_SINGLE_LINE_LINE_HEIGHT = 22;

export const getInputFieldInputStyle = (color: Colors, multiline?: boolean) => ({
  flex: 1,
  minWidth: 0,
  fontSize: 16,
  ...(IS_IOS && !multiline ? { lineHeight: IOS_SINGLE_LINE_LINE_HEIGHT } : {}),
  color: color.text.primary,
  paddingVertical: multiline ? 8 : 0,
  paddingRight: 0,
  margin: 0,
  textAlignVertical: (multiline ? 'top' : 'center') as 'top' | 'center',
  ...(IS_ANDROID && !multiline ? {} : { includeFontPadding: false }),
});

export const InputField = ({
  color,
  hasValue = false,
  leftIcon,
  rightElement,
  children,
  containerStyle,
}: InputFieldProps) => {
  const borderColor = hasValue ? color.accent.primary : color.border.default;

  return (
    <View
      style={[
        CONTAINER_BASE,
        {
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor,
          alignItems: 'center',
        },
        containerStyle,
      ]}
    >
      {leftIcon}
      {children}
      {rightElement}
    </View>
  );
};
