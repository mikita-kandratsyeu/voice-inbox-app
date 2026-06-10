import { FileText } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';

type RecordCardSourceChipProps = {
  label: string;
  color: Colors;
};

export const RecordCardSourceChip = memo(function RecordCardSourceChip({
  label,
  color,
}: RecordCardSourceChipProps) {
  const accentColor = color.accent.transcript;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
        maxWidth: '100%',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: withAlphaHex(accentColor, 0.14),
        borderWidth: 1,
        borderColor: withAlphaHex(accentColor, 0.28),
      }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <FileText size={12} color={accentColor} strokeWidth={2.2} />
      <Text
        style={{
          flexShrink: 1,
          fontSize: 11,
          fontWeight: '600',
          color: color.text.primary,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});
