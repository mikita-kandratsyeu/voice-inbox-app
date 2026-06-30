import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/** Pauses React subtrees when a screen loses focus — saves CPU on graph, recording, and detail stacks. */
export const FREEZE_ON_BLUR_OPTIONS = {
  freezeOnBlur: true,
} as const satisfies Pick<NativeStackNavigationOptions, 'freezeOnBlur'>;

export const ROOT_STACK_DEFAULTS = {
  headerShown: false,
  ...FREEZE_ON_BLUR_OPTIONS,
} as const satisfies NativeStackNavigationOptions;

export const NESTED_STACK_DEFAULTS = {
  headerShown: false,
  ...FREEZE_ON_BLUR_OPTIONS,
} as const satisfies NativeStackNavigationOptions;

export const MODAL_STACK_OPTIONS = {
  presentation: 'fullScreenModal' as const,
  animation: 'slide_from_bottom' as const,
  fullScreenGestureEnabled: true,
  gestureEnabled: true,
  ...FREEZE_ON_BLUR_OPTIONS,
};

export const CARD_PUSH_OPTIONS = {
  animation: 'slide_from_right' as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  ...FREEZE_ON_BLUR_OPTIONS,
};
