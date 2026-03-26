import type { BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs';
import {
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useEffect } from 'react';

type ScrollToTopRef = {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

export const useScrollToTopOnTabPress = (
  ref: React.RefObject<ScrollToTopRef | null>,
  onTabPress?: () => void,
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
      ref.current?.scrollTo?.({ x: 0, y: 0, animated: true });
      ref.current?.scrollToOffset?.({ offset: 0, animated: true });
      onTabPress?.();
    });

    return unsubscribe;
  }, [navigation, onTabPress, ref]);
};
