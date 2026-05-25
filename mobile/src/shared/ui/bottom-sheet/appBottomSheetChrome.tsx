import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { ComponentType } from 'react';
import { createElement, useCallback, useMemo } from 'react';
import type { ViewStyle } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { bottomSheetModalStackBehavior } from '@/shared/lib';
import { modalKeyboardBehavior } from '@/shared/lib/platform';

export type AppBottomSheetBackdropPreset = 'dismissible' | 'blocking' | 'subtle';

const BACKDROP_BY_PRESET: Record<
  AppBottomSheetBackdropPreset,
  { pressBehavior: 'close' | 'none'; opacity: number }
> = {
  dismissible: { pressBehavior: 'close', opacity: 0.45 },
  subtle: { pressBehavior: 'close', opacity: 0.35 },
  blocking: { pressBehavior: 'none', opacity: 0.6 },
};

export const APP_BOTTOM_SHEET_HANDLE = {
  width: 36,
  height: 5,
  borderRadius: 2.5,
} as const;

/** Gorhom defaults (appearsOnIndex=1) keep backdrop invisible on single-snap / dynamic modals. */
export const APP_BOTTOM_SHEET_BACKDROP_SNAP = {
  appearsOnIndex: 0,
  disappearsOnIndex: -1,
} as const;

export type AppBottomSheetChromeOptions = {
  surface?: 'primary' | 'card';
  backdrop?: AppBottomSheetBackdropPreset;
  keyboardBlurBehavior?: 'restore' | 'none';
  snapPoints?: (string | number)[];
  enablePanDownToClose?: boolean;
  enableContentPanningGesture?: boolean;
  enableBlurKeyboardOnGesture?: boolean;
  enableDynamicSizing?: boolean;
  backgroundStyle?: ViewStyle;
  handleIndicatorStyle?: ViewStyle;
};

export function getAppBottomSheetBackgroundStyle(
  color: Colors,
  surface: 'primary' | 'card' = 'primary',
): ViewStyle {
  return {
    backgroundColor: surface === 'card' ? color.background.card : color.background.primary,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  };
}

export function getAppBottomSheetHandleStyle(color: Colors, extra?: ViewStyle): ViewStyle {
  return {
    ...APP_BOTTOM_SHEET_HANDLE,
    backgroundColor: color.icon.muted,
    ...extra,
  };
}

export function useAppBottomSheetBackdrop(
  preset: AppBottomSheetBackdropPreset = 'dismissible',
  custom?: ComponentType<BottomSheetBackdropProps>,
) {
  return useCallback(
    (props: BottomSheetBackdropProps) => {
      if (custom) {
        return createElement(custom, props);
      }
      const { pressBehavior, opacity } = BACKDROP_BY_PRESET[preset];
      return (
        <BottomSheetBackdrop
          {...props}
          {...APP_BOTTOM_SHEET_BACKDROP_SNAP}
          pressBehavior={pressBehavior}
          opacity={opacity}
        />
      );
    },
    [custom, preset],
  );
}

/** Shared defaults for `BottomSheetModal` (controlled or imperative). */
export function useAppBottomSheetChrome(options: AppBottomSheetChromeOptions = {}) {
  const color = useColors();
  const {
    surface = 'primary',
    backdrop = 'dismissible',
    keyboardBlurBehavior = 'restore',
    snapPoints,
    enablePanDownToClose = true,
    enableContentPanningGesture,
    enableBlurKeyboardOnGesture = true,
    enableDynamicSizing = snapPoints == null,
    backgroundStyle: backgroundStyleOverride,
    handleIndicatorStyle: handleIndicatorStyleOverride,
  } = options;

  const renderBackdrop = useAppBottomSheetBackdrop(backdrop);

  const backgroundStyle = useMemo(
    () => backgroundStyleOverride ?? getAppBottomSheetBackgroundStyle(color, surface),
    [backgroundStyleOverride, color, surface],
  );

  const handleIndicatorStyle = useMemo(
    () => handleIndicatorStyleOverride ?? getAppBottomSheetHandleStyle(color),
    [color, handleIndicatorStyleOverride],
  );

  return {
    stackBehavior: bottomSheetModalStackBehavior,
    enableDynamicSizing,
    enablePanDownToClose,
    enableOverDrag: false as const,
    enableContentPanningGesture,
    keyboardBehavior: modalKeyboardBehavior,
    keyboardBlurBehavior,
    enableBlurKeyboardOnGesture,
    snapPoints,
    backdropComponent: renderBackdrop,
    backgroundStyle,
    handleIndicatorStyle,
  };
}
