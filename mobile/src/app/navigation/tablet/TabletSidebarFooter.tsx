import { Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

import { getTabletSidebarLabelStyle } from './tabletSidebarTypography';

type TabletSidebarFooterProps = {
  color: Colors;
  isSettingsActive: boolean;
  onOpenSettings: () => void;
};

export function TabletSidebarFooter({
  color,
  isSettingsActive,
  onOpenSettings,
}: TabletSidebarFooterProps) {
  const { t } = useTranslation();
  const accent = color.accent.primary;

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onOpenSettings();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSettingsActive }}
      accessibilityLabel={t('tabs.settings')}
      className="w-full flex-row items-center gap-2 px-1"
      style={({ pressed }) => ({
        minHeight: IOS_MIN_TOUCH_TARGET,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Settings
        size={22}
        color={isSettingsActive ? accent : color.text.secondary}
        strokeWidth={2}
      />
      <Text
        style={getTabletSidebarLabelStyle(
          isSettingsActive,
          isSettingsActive ? accent : color.text.primary,
        )}
        numberOfLines={1}
      >
        {t('tabs.settings')}
      </Text>
    </Pressable>
  );
}
