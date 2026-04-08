import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import {
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useEffect } from 'react';

import { flashListJumpToTop } from './flashListJumpToTop';

type ScrollToTopRef = {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

export const useScrollToTopOnTabPress = (
  ref: React.RefObject<ScrollToTopRef | null>,
  onTabPress?: () => void,
  onJumpVisualStart?: () => void,
  onJumpVisualEnd?: () => void,
) => {
  const navigation = useNavigation();

  useEffect(() => {
    const parentNavigation = navigation.getParent() as
      | NavigationProp<
          ParamListBase,
          string,
          undefined,
          NavigationState,
          Record<string, unknown>,
          BottomTabNavigationEventMap
        >
      | undefined;

    if (!parentNavigation) {
      return;
    }

    const unsubscribe = parentNavigation.addListener('tabPress', () => {
      onJumpVisualStart?.();
      onTabPress?.();
      ref.current?.scrollTo?.({ x: 0, y: 0, animated: false });
      requestAnimationFrame(() => {
        flashListJumpToTop(ref.current ?? undefined);
        requestAnimationFrame(() => {
          onJumpVisualEnd?.();
        });
      });
    });

    return unsubscribe;
  }, [navigation, onJumpVisualEnd, onJumpVisualStart, onTabPress, ref]);
};
