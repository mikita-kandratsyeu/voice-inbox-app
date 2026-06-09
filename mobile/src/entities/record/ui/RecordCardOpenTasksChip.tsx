import { ListChecks } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type RecordCardOpenTasksChipProps = {
  label: string;
  color: Colors;
};

export const RecordCardOpenTasksChip = memo(function RecordCardOpenTasksChip({
  label,
  color,
}: RecordCardOpenTasksChipProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: color.background.tertiary,
      }}
      accessibilityRole="text"
    >
      <ListChecks size={12} color={color.icon.muted} strokeWidth={2.2} />
      <Text
        style={{ fontSize: 11, fontWeight: '600', color: color.text.secondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});
