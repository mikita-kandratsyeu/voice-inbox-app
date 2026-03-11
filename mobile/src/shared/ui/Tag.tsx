import React from 'react';
import { Text, View } from 'react-native';

type TagProps = {
  label: string;
};

export const Tag = ({ label }: TagProps) => (
  <View className="rounded-full bg-blue-50 px-3 py-1 dark:bg-blue-950">
    <Text className="text-xs font-medium text-blue-500 dark:text-blue-400">{label}</Text>
  </View>
);
