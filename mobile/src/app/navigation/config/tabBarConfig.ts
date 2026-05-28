import { Inbox, Settings } from 'lucide-react-native';
import { type ViewStyle } from 'react-native';

import { i18n, selectPlatform } from '@/shared/lib';

/** Horizontal inset from screen edges when the pill is narrower than {@link FLOAT_TAB_MAX_WIDTH}. */
export const FLOAT_TAB_HORIZONTAL_INSET = 28;
/** Max width of the floating tab bar pill (phone and tablet, centered). */
export const FLOAT_TAB_MAX_WIDTH = 480;
/** Gap between home indicator / screen bottom and the tab bar. */
export const FLOAT_TAB_BOTTOM_GAP = 10;
/** Tab bar pill fill: 1 = opaque; lower = slight glass effect over the screen behind. */
export const FLOAT_TAB_BAR_BACKGROUND_OPACITY = 0.88;
/** Inner vertical padding inside the pill (top / bottom). */
export const FLOAT_TAB_INNER_PAD_VERTICAL = 11;
export const FLOAT_TAB_BAR_HEIGHT_PHONE = 72;
export const FLOAT_TAB_BAR_HEIGHT_TABLET = 90;

/** iOS: soft lift so the pill reads above the list without a heavy gray halo (esp. with blur). */
export const FLOAT_TAB_IOS_SHADOW_OFFSET_Y = 5;
export const FLOAT_TAB_IOS_SHADOW_RADIUS = 12;

/** Caps shadow strength from theme token — keep tab bar shadow lighter than cards. */
export function floatingTabBarShadowOpacity(themeShadowOpacity: number): number {
  return Math.min(0.11, themeShadowOpacity + 0.04);
}

const EXTRA_SCROLL_BUFFER = 12;

/** Bottom padding for scroll/list content so it clears the floating tab bar. */
export function getFloatingTabBarScrollPaddingBottom(
  safeAreaBottom: number,
  isTablet: boolean,
): number {
  const barH = isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE;
  return barH + FLOAT_TAB_BOTTOM_GAP + safeAreaBottom + EXTRA_SCROLL_BUFFER;
}

export const BATCH_ACTION_BAR_PADDING_TOP = 16;
export const BATCH_ACTION_BAR_ROW_HEIGHT = 54;
export const BATCH_ACTION_BAR_HOME_GAP = 8;

export function getBatchActionBarHeight(safeAreaBottom: number): number {
  return (
    BATCH_ACTION_BAR_PADDING_TOP +
    BATCH_ACTION_BAR_ROW_HEIGHT +
    Math.max(safeAreaBottom, 8) +
    BATCH_ACTION_BAR_HOME_GAP
  );
}

export function getInboxBatchModeScrollPaddingBottom(safeAreaBottom: number): number {
  return getBatchActionBarHeight(safeAreaBottom) + EXTRA_SCROLL_BUFFER;
}

export type BuildFloatingTabBarStyleParams = {
  insets: { bottom: number; left: number; right: number };
  windowWidth: number;
  isTablet: boolean;
  shadowColor: string;
  shadowOpacity: number;
};

export function buildFloatingTabBarStyle(p: BuildFloatingTabBarStyleParams): ViewStyle {
  const tabBarHeight = p.isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE;
  const usableW = p.windowWidth - p.insets.left - p.insets.right;
  const tabBarWidth = Math.min(
    FLOAT_TAB_MAX_WIDTH,
    Math.max(0, usableW - FLOAT_TAB_HORIZONTAL_INSET * 2),
  );
  const tabBarLeft = p.insets.left + (usableW - tabBarWidth) / 2;

  return {
    position: 'absolute',
    left: tabBarLeft,
    width: tabBarWidth,
    marginHorizontal: 0,
    bottom: FLOAT_TAB_BOTTOM_GAP + p.insets.bottom,
    height: tabBarHeight,
    paddingTop: FLOAT_TAB_INNER_PAD_VERTICAL,
    paddingBottom: FLOAT_TAB_INNER_PAD_VERTICAL,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderWidth: 0,
    borderRadius: tabBarHeight / 2,
    ...selectPlatform({
      ios: {
        shadowColor: p.shadowColor,
        shadowOffset: { width: 0, height: FLOAT_TAB_IOS_SHADOW_OFFSET_Y },
        shadowOpacity: p.shadowOpacity,
        shadowRadius: FLOAT_TAB_IOS_SHADOW_RADIUS,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  };
}

export const TAB_ICON_SIZE = 24;

export const TAB_LABELS = {
  get Inbox() {
    return i18n.t('tabs.inbox');
  },
  get Settings() {
    return i18n.t('tabs.settings');
  },
} as const;

export const TAB_ICONS = {
  Inbox,
  Settings,
} as const;
