import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type RecordDetailTagProps = {
  label: string;
};

export const RecordDetailTag = ({ label }: RecordDetailTagProps) => {
  const color = useColors();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      className="flex-row items-center rounded-full px-3 py-1"
      style={{ backgroundColor: color.background.tertiary }}
    >
      <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
        {label}
      </Text>
    </View>
  );
};
