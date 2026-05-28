import { Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { TabletSidebarCollapseButton } from './TabletSidebarCollapseButton';
import { TabletSidebarNavIcon, TabletSidebarNavItem } from './TabletSidebarNavItem';
import type { TabletSidebarTheme } from './tabletSidebarTheme';

type TabletSidebarFooterProps = {
  color: Colors;
  theme: TabletSidebarTheme;
  isSettingsActive: boolean;
  isCollapsed: boolean;
  onOpenSettings: () => void;
  onToggleCollapsed: () => void;
};

export function TabletSidebarFooter({
  color,
  theme,
  isSettingsActive,
  isCollapsed,
  onOpenSettings,
  onToggleCollapsed,
}: TabletSidebarFooterProps) {
  const { t } = useTranslation();
  const accent = color.accent.primary;

  const settingsItem = (
    <TabletSidebarNavItem
      label={t('tabs.settings')}
      isActive={isSettingsActive}
      color={color}
      theme={theme}
      appearance="ghost"
      collapsed={isCollapsed}
      onPress={() => {
        hapticSelection();
        onOpenSettings();
      }}
      icon={
        <TabletSidebarNavIcon
          isActive={isSettingsActive}
          activeColor={accent}
          inactiveColor={color.text.secondary}
        >
          <Settings />
        </TabletSidebarNavIcon>
      }
    />
  );

  const collapseButton = (
    <TabletSidebarCollapseButton
      color={color}
      isCollapsed={isCollapsed}
      onPress={onToggleCollapsed}
    />
  );

  if (isCollapsed) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        {settingsItem}
        {collapseButton}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>{settingsItem}</View>
      {collapseButton}
    </View>
  );
}
