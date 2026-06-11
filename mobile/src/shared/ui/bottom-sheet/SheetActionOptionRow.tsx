import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';

type SheetActionOptionRowProps = {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  onPress: () => void;
  isLast?: boolean;
  trailing?: React.ReactNode;
};

export function SheetActionOptionRow({
  label,
  hint,
  icon,
  onPress,
  isLast = false,
  trailing,
}: SheetActionOptionRowProps) {
  const color = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: color.border.default,
        flexDirection: 'row',
        alignItems: 'center',
        gap: hint ? 12 : 10,
      }}
    >
      {icon}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          flexWrap: hint ? 'wrap' : undefined,
          alignItems: 'center',
          gap: hint ? 8 : 0,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: color.text.primary,
            flex: hint ? undefined : 1,
            flexShrink: 1,
          }}
          numberOfLines={hint ? 2 : 1}
        >
          {label}
        </Text>
        {trailing}
      </View>
    </TouchableOpacity>
  );
}
