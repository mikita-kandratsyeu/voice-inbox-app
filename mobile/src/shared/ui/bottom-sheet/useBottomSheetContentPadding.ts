import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom padding for sheet content that respects the home indicator. */
export function useBottomSheetContentPadding(minBottom = 20) {
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, minBottom) }),
    [insets.bottom, minBottom],
  );
}
