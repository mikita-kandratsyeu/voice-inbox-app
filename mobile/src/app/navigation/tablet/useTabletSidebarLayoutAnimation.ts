import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
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

function contentLayoutWidth(windowWidth: number, isCollapsed: boolean): number {
  return windowWidth - (isCollapsed ? TABLET_SIDEBAR_COLLAPSED_WIDTH : TABLET_SIDEBAR_WIDTH);
}

export function useTabletSidebarLayoutAnimation(isCollapsed: boolean) {
  const { width: windowWidth } = useWindowDimensions();
  const isCollapsedRef = useRef(isCollapsed);
  isCollapsedRef.current = isCollapsed;

  const windowWidthSv = useSharedValue(windowWidth);
  const progress = useSharedValue(isCollapsed ? 1 : 0);
  const contentLayoutWidthSv = useSharedValue(contentLayoutWidth(windowWidth, isCollapsed));

  useEffect(() => {
    windowWidthSv.value = windowWidth;
    contentLayoutWidthSv.value = contentLayoutWidth(windowWidth, isCollapsedRef.current);
  }, [windowWidth, windowWidthSv, contentLayoutWidthSv]);

  useEffect(() => {
    const targetLayoutWidth = contentLayoutWidth(windowWidth, isCollapsed);

    if (isCollapsed) {
      // Viewport grows while collapsing — apply target width immediately to avoid a white strip on the right.
      contentLayoutWidthSv.value = targetLayoutWidth;
    }

    progress.value = withSpring(isCollapsed ? 1 : 0, TABLET_SIDEBAR_LAYOUT_SPRING, (finished) => {
      if (finished) {
        contentLayoutWidthSv.value = targetLayoutWidth;
      }
    });
  }, [isCollapsed, progress, windowWidth, contentLayoutWidthSv]);

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

  /**
   * Expanding: frozen until spring ends (viewport shrinks, overflow clips).
   * Collapsing: updated at start (viewport grows, must fill immediately).
   */
  const contentInnerStyle = useAnimatedStyle(() => ({
    width: contentLayoutWidthSv.value,
  }));

  return {
    progress,
    sidebarShellStyle,
    expandedLayerStyle,
    collapsedLayerStyle,
    contentInnerStyle,
  };
}
