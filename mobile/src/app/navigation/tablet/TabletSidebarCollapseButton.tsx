import { PanelLeftClose, PanelRightOpen } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { Button } from '@/shared/ui';

import { useTabletSidebarLayout } from './TabletSidebarLayoutContext';
import { TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE } from './tabletSidebarMetrics';

type TabletSidebarCollapseButtonProps = {
  color: Colors;
  isCollapsed: boolean;
  onPress: () => void;
};

export function TabletSidebarCollapseButton({
  color,
  isCollapsed,
  onPress,
}: TabletSidebarCollapseButtonProps) {
  const { t } = useTranslation();
  const { progress } = useTabletSidebarLayout();
  const iconColor = color.text.secondary;

  const expandIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.65, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0.65, 1], [0.88, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const collapseIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.35], [1, 0.88], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Button
      variant="ghost"
      iconOnly
      size="lg"
      color={color}
      icon={
        <Animated.View
          style={{
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={[{ position: 'absolute' }, collapseIconStyle]}>
            <PanelLeftClose size={22} color={iconColor} strokeWidth={2} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, expandIconStyle]}>
            <PanelRightOpen size={22} color={iconColor} strokeWidth={2} />
          </Animated.View>
        </Animated.View>
      }
      accessibilityLabel={
        isCollapsed ? t('tablet.sidebar.expandSidebar') : t('tablet.sidebar.collapseSidebar')
      }
      activeOpacity={0.85}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      className="min-h-0 py-0"
      containerStyle={{
        width: TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
        height: TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
        minHeight: TABLET_SIDEBAR_COLLAPSED_ITEM_SIZE,
        paddingVertical: 0,
        backgroundColor: 'transparent',
      }}
    />
  );
}
