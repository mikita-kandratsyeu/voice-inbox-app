import { Crown } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type PaywallHeaderProps = {
  color: Colors;
  title: string;
  subtitle: string;
};

export function PaywallHeader({ color, title, subtitle }: PaywallHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center">
      <View
        className="mr-2.5 h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Crown size={20} color={color.accent.primary} strokeWidth={1.8} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[20px] font-bold leading-6" style={{ color: color.text.primary }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[13px] leading-[17px]" style={{ color: color.text.secondary }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
