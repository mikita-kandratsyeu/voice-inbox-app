import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { TABLET_SIDEBAR_COLLAPSED_WIDTH, TABLET_SIDEBAR_WIDTH } from './tabletSidebarMetrics';

/** iPad-style spring: quick settle without bounce. */
export const TABLET_SIDEBAR_LAYOUT_SPRING = {
  damping: 24,
  stiffness: 320,
  mass: 0.85,
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
    const settleLayoutWidth = () => {
      contentLayoutWidthSv.value = contentLayoutWidth(windowWidth, isCollapsed);
    };

    progress.value = withSpring(isCollapsed ? 1 : 0, TABLET_SIDEBAR_LAYOUT_SPRING, (finished) => {
      if (finished) {
        runOnJS(settleLayoutWidth)();
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
    opacity: interpolate(progress.value, [0, 0.38], [1, 0], Extrapolation.CLAMP),
  }));

  const collapsedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.62, 1], [0, 1], Extrapolation.CLAMP),
  }));

  /** Frozen for the duration of the spring; updated once when motion settles. */
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
