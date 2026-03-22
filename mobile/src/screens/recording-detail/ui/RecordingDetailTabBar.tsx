import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import type { Tab } from '../config';
import { getTabLabel } from '../config';

const TABS: Tab[] = ['transcript', 'summary', 'tasks'];

type RecordingDetailTabBarProps = {
  active: Tab;
  onSelect: (tab: Tab) => void;
  color: Colors;
};

export const RecordingDetailTabBar = ({ active, onSelect, color }: RecordingDetailTabBarProps) => (
  <View className="flex-row border-b" style={{ borderBottomColor: color.border.default }}>
    {TABS.map((tab) => {
      const isActive = tab === active;

      return (
        <TouchableOpacity
          key={tab}
          accessibilityRole="button"
          accessibilityLabel={getTabLabel(tab)}
          className="relative flex-1 items-center justify-center py-3"
          style={{ minHeight: IOS_MIN_TOUCH_TARGET }}
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: isActive ? color.accent.primary : color.text.secondary }}
          >
            {getTabLabel(tab)}
          </Text>
          {isActive && (
            <View
              className="absolute bottom-0 left-[15%] right-[15%] h-0.5 rounded-sm"
              style={{ backgroundColor: color.accent.primary }}
            />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);
