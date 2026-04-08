import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';

type SectionHeaderProps = {
  title: string;
  isFirst?: boolean;
};

export const SectionHeader = memo(function SectionHeader({ title, isFirst }: SectionHeaderProps) {
  const color = useColors();
  const headerBgStyle = { backgroundColor: color.background.secondary };
  const headerTextStyle = { color: color.text.secondary };

  return (
    <View className={`mx-4 mb-3 ${isFirst ? 'mt-2.5' : 'mt-3'}`} style={headerBgStyle}>
      <Text className="text-xs font-semibold uppercase tracking-widest" style={headerTextStyle}>
        {title}
      </Text>
    </View>
  );
});
