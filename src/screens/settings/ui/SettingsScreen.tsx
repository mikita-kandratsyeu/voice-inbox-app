import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';

export const SettingsScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');

  const safeAreaStyle = { flex: 1, backgroundColor: color.background.primary };
  const titleStyle = { color: color.text.primary };

  return (
    <SafeAreaView style={safeAreaStyle} edges={['top']}>
      <View className="flex-1 items-center justify-center">
        <Text style={titleStyle} className="text-lg font-semibold">
          Настройки
        </Text>
      </View>
    </SafeAreaView>
  );
};
