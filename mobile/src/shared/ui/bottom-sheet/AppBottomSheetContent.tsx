import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';

import { useIsTablet } from '@/shared/lib';

import { useBottomSheetContentPadding } from './useBottomSheetContentPadding';

type BaseContentProps = PropsWithChildren<{
  /** @default 20 */
  paddingHorizontal?: number;
  /** @default 20 for phone, 24 for tablet (when useTabletPadding = true) */
  bottomPadding?: number;
  /** @default false - when true, uses larger padding on tablets */
  useTabletPadding?: boolean;
  style?: ViewStyle;
}>;

type AppBottomSheetContentProps = BaseContentProps & {
  /** @default false */
  scrollable?: false;
};

type AppBottomSheetScrollableContentProps = BaseContentProps & {
  scrollable: true;
  /** @default true */
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** @default false */
  showsVerticalScrollIndicator?: boolean;
};

/**
 * Standard content wrapper for bottom sheets with automatic padding.
 * Reduces boilerplate - no need to manually add paddingHorizontal, paddingTop, contentPadding.
 *
 * @example
 * <AppBottomSheetModal visible={visible} onClose={onClose}>
 *   <AppBottomSheetContent>
 *     <Text>Your content here</Text>
 *   </AppBottomSheetContent>
 * </AppBottomSheetModal>
 *
 * @example Scrollable variant
 * <AppBottomSheetModal visible={visible} onClose={onClose}>
 *   <AppBottomSheetContent scrollable>
 *     <Text>Long scrollable content here</Text>
 *   </AppBottomSheetContent>
 * </AppBottomSheetModal>
 */
export function AppBottomSheetContent(
  props: AppBottomSheetContentProps | AppBottomSheetScrollableContentProps,
) {
  const {
    children,
    paddingHorizontal: paddingHorizontalProp,
    bottomPadding: bottomPaddingProp,
    useTabletPadding = false,
    style,
  } = props;

  const isTablet = useIsTablet();
  const defaultPaddingH = useTabletPadding && isTablet ? 24 : 20;
  const paddingHorizontal = paddingHorizontalProp ?? defaultPaddingH;
  const bottomPadding = bottomPaddingProp ?? defaultPaddingH;

  const contentPadding = useBottomSheetContentPadding(bottomPadding);

  const contentStyle: ViewStyle = {
    paddingHorizontal,
    paddingTop: 8,
    ...contentPadding,
    ...style,
  };

  if ('scrollable' in props && props.scrollable) {
    const { keyboardShouldPersistTaps = 'handled', showsVerticalScrollIndicator = false } =
      props as AppBottomSheetScrollableContentProps;

    return (
      <BottomSheetScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={contentStyle}
      >
        {children}
      </BottomSheetScrollView>
    );
  }

  return <BottomSheetView style={contentStyle}>{children}</BottomSheetView>;
}
