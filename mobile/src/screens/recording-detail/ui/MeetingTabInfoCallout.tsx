import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type MeetingTabInfoCalloutProps = {
  color: Colors;
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

/** Info callout shared by meeting-related detail tabs (summary, who-said-what). */
export function MeetingTabInfoCallout({
  color,
  icon,
  title,
  children,
}: MeetingTabInfoCalloutProps) {
  return (
    <View
      className="flex-row gap-3 rounded-xl border p-3"
      style={{
        borderColor: color.border.default,
        backgroundColor: color.background.tertiary,
      }}
    >
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

type MeetingTabInfoCalloutTextProps = {
  color: Colors;
  children: ReactNode;
  variant?: 'secondary' | 'muted';
};

export function MeetingTabInfoCalloutText({
  color,
  children,
  variant = 'secondary',
}: MeetingTabInfoCalloutTextProps) {
  return (
    <Text
      className="text-[13px] leading-5"
      style={{ color: variant === 'muted' ? color.text.muted : color.text.secondary }}
    >
      {children}
    </Text>
  );
}
