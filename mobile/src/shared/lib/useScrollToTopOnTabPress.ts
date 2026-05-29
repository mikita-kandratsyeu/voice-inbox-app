import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import {
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
  useIsFocused,
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
  const isFocused = useIsFocused();

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
      if (!isFocused) {
        return;
      }
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
  }, [isFocused, navigation, onJumpVisualEnd, onJumpVisualStart, onTabPress, ref]);
};
