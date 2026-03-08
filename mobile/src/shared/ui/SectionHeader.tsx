import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SectionHeaderProps = {
  title: string;
  color: Colors;
  isFirst?: boolean;
};

export const SectionHeader = ({ title, color, isFirst }: SectionHeaderProps) => {
  const headerBgStyle = { backgroundColor: color.background.secondary };
  const headerTextStyle = { color: color.text.secondary };

  return (
    <View className={`mx-4 mb-3 ${isFirst ? 'mt-1' : 'mt-6'}`} style={headerBgStyle}>
      <Text className="text-xs font-semibold uppercase tracking-widest" style={headerTextStyle}>
        {title}
      </Text>
    </View>
  );
};
