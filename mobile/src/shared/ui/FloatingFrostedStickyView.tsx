import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { getFloatingFrostedInputKeyboardStickyOffset } from './floatingSearchBarMetrics';

type FloatingFrostedStickyViewProps = {
  safeAreaBottom: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  children: ReactNode;
};

export function FloatingFrostedStickyView({
  safeAreaBottom,
  style,
  pointerEvents,
  children,
}: FloatingFrostedStickyViewProps) {
  return (
    <KeyboardStickyView
      offset={getFloatingFrostedInputKeyboardStickyOffset(safeAreaBottom)}
      pointerEvents={pointerEvents}
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10 }, style]}
    >
      {children}
    </KeyboardStickyView>
  );
}
