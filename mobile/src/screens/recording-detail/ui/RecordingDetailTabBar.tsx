import { AlignLeft, ClipboardList, FileText, ListChecks, UsersRound } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import type { Tab } from '../config';
import { getTabLabel } from '../config';

const DEFAULT_TABS: Tab[] = ['transcript', 'summary', 'tasks'];

type RecordingDetailTabBarProps = {
  active: Tab;
  onSelect: (tab: Tab) => void;
  color: Colors;
  hasAudio?: boolean;
  tabs?: Tab[];
};

export const RecordingDetailTabBar = ({
  active,
  onSelect,
  color,
  hasAudio = true,
  tabs,
}: RecordingDetailTabBarProps) => {
  const rowTabs = tabs ?? DEFAULT_TABS;

  return (
    <View
      className="flex-row"
      style={{
        overflow: 'hidden',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.border.default,
      }}
    >
      {rowTabs.map((tab) => {
        const isActive = tab === active;
        const label = getTabLabel(tab, { hasAudio });
        const iconColor = isActive ? color.accent.primary : color.tab.inactive;
        const iconProps = { size: 22, color: iconColor, strokeWidth: 2.2 as const };

        const icon =
          tab === 'transcript' ? (
            hasAudio ? (
              <AlignLeft {...iconProps} />
            ) : (
              <FileText {...iconProps} />
            )
          ) : tab === 'summary' ? (
            <ClipboardList {...iconProps} />
          ) : tab === 'dialogue' ? (
            <UsersRound {...iconProps} />
          ) : tab === 'tasks' ? (
            <ListChecks {...iconProps} />
          ) : (
            <FileText {...iconProps} />
          );

        return (
          <TouchableOpacity
            key={tab}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            className="relative flex-1 items-center justify-center px-1 py-3"
            style={{ minHeight: IOS_MIN_TOUCH_TARGET }}
            onPress={() => onSelect(tab)}
            activeOpacity={0.75}
          >
            {icon}
            {isActive && (
              <View
                pointerEvents="none"
                className="absolute left-0 right-0 items-center"
                style={{ bottom: 6 }}
              >
                <View
                  className="h-[3px] w-9 rounded-full"
                  style={{ backgroundColor: color.accent.primary }}
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
