import { Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { TabletSidebarNavIcon, TabletSidebarNavItem } from './TabletSidebarNavItem';
import type { TabletSidebarTheme } from './tabletSidebarTheme';

type TabletSidebarFooterProps = {
  color: Colors;
  theme: TabletSidebarTheme;
  isSettingsActive: boolean;
  onOpenSettings: () => void;
};

export function TabletSidebarFooter({
  color,
  theme,
  isSettingsActive,
  onOpenSettings,
}: TabletSidebarFooterProps) {
  const { t } = useTranslation();
  const accent = color.accent.primary;

  return (
    <TabletSidebarNavItem
      label={t('tabs.settings')}
      isActive={isSettingsActive}
      color={color}
      theme={theme}
      appearance="ghost"
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
}
