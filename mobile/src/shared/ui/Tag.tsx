import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type TagProps = {
  label: string;
  color: Colors;
};

export const Tag = ({ label, color }: TagProps) => (
  <View className="rounded-full px-3 py-1" style={{ backgroundColor: color.status.processing.bg }}>
    <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
      {label}
    </Text>
  </View>
);
