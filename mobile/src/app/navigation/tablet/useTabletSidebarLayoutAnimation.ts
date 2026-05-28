import { useEffect } from 'react';
import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { TABLET_SIDEBAR_COLLAPSED_WIDTH, TABLET_SIDEBAR_WIDTH } from './tabletSidebarMetrics';

/** ~280ms, critical damping — predictable sidebar motion without bounce. */
export const TABLET_SIDEBAR_LAYOUT_SPRING = {
  duration: 280,
  dampingRatio: 1,
};

export function useTabletSidebarLayoutAnimation(isCollapsed: boolean) {
  const progress = useSharedValue(isCollapsed ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isCollapsed ? 1 : 0, TABLET_SIDEBAR_LAYOUT_SPRING);
  }, [isCollapsed, progress]);

  const sidebarShellStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [TABLET_SIDEBAR_WIDTH, TABLET_SIDEBAR_COLLAPSED_WIDTH],
      Extrapolation.CLAMP,
    ),
  }));

  const expandedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));

  const collapsedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.65, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return {
    progress,
    sidebarShellStyle,
    expandedLayerStyle,
    collapsedLayerStyle,
  };
}
