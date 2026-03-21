import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Colors } from '@/shared/config';

type InboxHeaderProps = {
  color: Colors;
  isLoaded: boolean;
  rightSlot?: React.ReactNode;
  subtitleText: string;
  title: string;
};

export const InboxHeader = ({
  color,
  isLoaded,
  rightSlot,
  subtitleText,
  title,
}: InboxHeaderProps) => {
  const insets = useSafeAreaInsets();

  const headerStyle = {
    backgroundColor: color.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    paddingTop: insets.top + 16,
  };
  const titleStyle = { color: color.text.primary };
  const subtitleStyle = { color: color.text.secondary };

  return (
    <View className="px-4 pb-3" style={headerStyle}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-bold" style={titleStyle}>
            {title}
          </Text>
          {isLoaded ? (
            <Text className="mt-1 text-sm" style={subtitleStyle}>
              {subtitleText}
            </Text>
          ) : (
            <View
              className="mt-2 h-3 w-20 rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            />
          )}
        </View>
        {rightSlot !== undefined ? <View className="pt-0.5">{rightSlot}</View> : null}
      </View>
    </View>
  );
};
