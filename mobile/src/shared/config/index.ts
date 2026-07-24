export {
  ANIMATION_DURATIONS,
  GESTURE_THRESHOLDS,
  getAnimationDuration,
  initReduceMotionCheck,
  SCALE_VALUES,
  shouldReduceMotion,
  SPRING_CONFIGS,
  TIMING_CONFIGS,
  withReduceMotion,
} from './animations';
export { BootSplashVisibleProvider, useBootSplashVisible } from './bootSplashThemeContext';
export type { AccentColorId, Colors, ColorScheme } from './colors';
export {
  ACCENT_COLOR_IDS,
  ACCENT_COLOR_SWATCHES,
  ACCENT_COLOR_SWATCHES_DEFAULT_FIRST,
  colors,
  DEFAULT_ACCENT_COLOR_ID,
  getAccentColorSwatches,
  getAccentColorSwatchesCurrentFirst,
  getAccentPreviewHex,
  getColors,
  parseAccentColorId,
} from './colors';
export { FREE_WEEKLY_LIMIT, PRO_LICENSE_STATUS_CACHE_MS, PRO_WEEKLY_LIMIT } from './productLimits';
export {
  FADE_IN_EASING_OUT_CUBIC,
  useFadeInEntering,
  useFadeOutExiting,
  useIsMotionReduced,
} from './reanimatedMotion';
export { getWebsiteUrl } from './runtimeConfig';
export { useAppTheme, useColors } from './useAppTheme';
