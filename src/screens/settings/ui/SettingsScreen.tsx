import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';

export const SettingsScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();

  const screenStyle = {
    flex: 1,
    backgroundColor: color.background.primary,
    paddingTop: insets.top,
  };
  const titleStyle = { color: color.text.primary };

  return (
    <View style={screenStyle}>
      <View className="flex-1 items-center justify-center">
        <Text style={titleStyle} className="text-lg font-semibold">
          Настройки
        </Text>
      </View>
    </View>
  );
};
