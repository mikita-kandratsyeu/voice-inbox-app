import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type TagProps = {
  label: string;
};

export const Tag = ({ label }: TagProps) => {
  const color = useColors();
  return (
    <View
      className="rounded-full px-3 py-1"
      style={{ backgroundColor: color.status.processing.bg }}
    >
      <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
        {label}
      </Text>
    </View>
  );
};
