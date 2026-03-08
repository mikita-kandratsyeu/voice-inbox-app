import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type RecordDetailTagProps = {
  label: string;
  color: Colors;
};

export const RecordDetailTag = ({ label, color }: RecordDetailTagProps) => (
  <View
    className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
    style={{ backgroundColor: color.background.tertiary }}
  >
    <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
      {label}
    </Text>
  </View>
);
