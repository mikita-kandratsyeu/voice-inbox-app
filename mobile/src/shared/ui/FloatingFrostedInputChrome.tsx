import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';

import { FloatingFrostedChrome } from './FloatingFrostedChrome';
import {
  FLOATING_FROSTED_CHROME_TOP_INSET,
  FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP,
  getFloatingSearchBarChromeBottomInset,
} from './floatingSearchBarMetrics';

type FloatingFrostedInputChromeProps = {
  color: Parameters<typeof FloatingFrostedChrome>[0]['color'];
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Floating frosted pill that tightens against the keyboard when it is open. */
export function FloatingFrostedInputChrome({
  color,
  contentStyle,
  children,
}: FloatingFrostedInputChromeProps) {
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  return (
    <FloatingFrostedChrome
      color={color}
      insetsBottom={0}
      outerBottomPadding={
        isKeyboardVisible
          ? FLOATING_SEARCH_BAR_KEYBOARD_OPEN_GAP
          : getFloatingSearchBarChromeBottomInset()
      }
      topInset={isKeyboardVisible ? 0 : FLOATING_FROSTED_CHROME_TOP_INSET}
      contentStyle={contentStyle}
    >
      {children}
    </FloatingFrostedChrome>
  );
}
