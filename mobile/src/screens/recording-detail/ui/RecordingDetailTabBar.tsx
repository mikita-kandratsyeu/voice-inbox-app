import { AlignLeft, ClipboardList, FileText, ListTodo, UsersRound } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { TestIds } from '@/shared/e2e';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';
import { FLOATING_DETAIL_TAB_BAR_HEIGHT } from '@/shared/ui';

import type { Tab } from '../config';
import { getTabLabel } from '../config';

const TAB_TEST_IDS: Record<Tab, string> = {
  transcript: TestIds.detail.tab.transcript,
  summary: TestIds.detail.tab.summary,
  dialogue: TestIds.detail.tab.dialogue,
  tasks: TestIds.detail.tab.tasks,
};

const DEFAULT_TABS: Tab[] = ['transcript', 'summary', 'tasks'];

type RecordingDetailTabBarProps = {
  active: Tab;
  onSelect: (tab: Tab) => void;
  color: Colors;
  hasAudio?: boolean;
  tabs?: Tab[];
  variant?: 'inline' | 'floating';
};

export const RecordingDetailTabBar = ({
  active,
  onSelect,
  color,
  hasAudio = true,
  tabs,
  variant = 'inline',
}: RecordingDetailTabBarProps) => {
  const rowTabs = tabs ?? DEFAULT_TABS;
  const isFloating = variant === 'floating';

  return (
    <View
      className="flex-row"
      style={
        isFloating
          ? undefined
          : {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: color.border.default,
            }
      }
    >
      {rowTabs.map((tab) => {
        const isActive = tab === active;
        const label = getTabLabel(tab, { hasAudio });
        const iconColor = isActive ? color.accent.primary : color.tab.inactive;
        const iconSize = isFloating ? 20 : 22;
        const iconProps = { size: iconSize, color: iconColor, strokeWidth: 2.2 as const };

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
            <ListTodo {...iconProps} />
          ) : (
            <FileText {...iconProps} />
          );

        return (
          <TouchableOpacity
            key={tab}
            testID={TAB_TEST_IDS[tab]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            className={`relative flex-1 items-center justify-center px-1 ${isFloating ? '' : 'py-3'}`}
            style={{
              height: isFloating ? FLOATING_DETAIL_TAB_BAR_HEIGHT : undefined,
              minHeight: isFloating ? undefined : IOS_MIN_TOUCH_TARGET,
            }}
            onPress={() => onSelect(tab)}
            activeOpacity={0.75}
          >
            {icon}
            {isActive && (
              <View
                pointerEvents="none"
                className="absolute left-0 right-0 items-center"
                style={{ bottom: isFloating ? 0 : 6 }}
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
