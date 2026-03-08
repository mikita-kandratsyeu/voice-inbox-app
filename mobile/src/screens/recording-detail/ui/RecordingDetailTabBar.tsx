import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

import type { Tab } from '../config';
import { TAB_LABELS } from '../config';

type RecordingDetailTabBarProps = {
  active: Tab;
  onSelect: (tab: Tab) => void;
  color: Colors;
};

export const RecordingDetailTabBar = ({ active, onSelect, color }: RecordingDetailTabBarProps) => (
  <View className="flex-row border-b" style={{ borderBottomColor: color.border.default }}>
    {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
      const isActive = tab === active;

      return (
        <TouchableOpacity
          key={tab}
          className="relative flex-1 items-center py-3"
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: isActive ? color.accent.primary : color.text.secondary }}
          >
            {TAB_LABELS[tab]}
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
