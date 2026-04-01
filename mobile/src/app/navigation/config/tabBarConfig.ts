import { Inbox, Settings } from 'lucide-react-native';
import { Platform, type ViewStyle } from 'react-native';

import { i18n } from '@/shared/lib';

/** Horizontal inset from screen edges (floating pill). */
export const FLOAT_TAB_HORIZONTAL_INSET = 28;
/** Fixed width of the floating pill on tablet (centered). */
export const FLOAT_TAB_MAX_WIDTH_TABLET = 480;
/** Gap between home indicator / screen bottom and the tab bar. */
export const FLOAT_TAB_BOTTOM_GAP = 10;
/** Inner vertical padding inside the pill (top / bottom). */
export const FLOAT_TAB_INNER_PAD_VERTICAL = 11;
export const FLOAT_TAB_BAR_HEIGHT_PHONE = 72;
export const FLOAT_TAB_BAR_HEIGHT_TABLET = 90;

const EXTRA_SCROLL_BUFFER = 12;

/** Bottom padding for scroll/list content so it clears the floating tab bar. */
export function getFloatingTabBarScrollPaddingBottom(
  safeAreaBottom: number,
  isTablet: boolean,
): number {
  const barH = isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE;
  return barH + FLOAT_TAB_BOTTOM_GAP + safeAreaBottom + EXTRA_SCROLL_BUFFER;
}

const BATCH_ACTION_BAR_VERTICAL_FOOTPRINT = 96;

export function getInboxBatchModeScrollPaddingBottom(safeAreaBottom: number): number {
  return BATCH_ACTION_BAR_VERTICAL_FOOTPRINT + safeAreaBottom + EXTRA_SCROLL_BUFFER;
}

export type BuildFloatingTabBarStyleParams = {
  insets: { bottom: number; left: number; right: number };
  windowWidth: number;
  isTablet: boolean;
  tabBackgroundColor: string;
  shadowColor: string;
  shadowOpacity: number;
};

export function buildFloatingTabBarStyle(p: BuildFloatingTabBarStyleParams): ViewStyle {
  const tabBarHeight = p.isTablet ? FLOAT_TAB_BAR_HEIGHT_TABLET : FLOAT_TAB_BAR_HEIGHT_PHONE;
  const usableW = p.windowWidth - p.insets.left - p.insets.right;
  let tabletTabBarWidth: number | undefined;
  let tabletTabBarLeft: number | undefined;

  if (p.isTablet) {
    tabletTabBarWidth = Math.min(FLOAT_TAB_MAX_WIDTH_TABLET, usableW);
    tabletTabBarLeft = p.insets.left + (usableW - tabletTabBarWidth) / 2;
  }

  return {
    position: 'absolute',
    ...(p.isTablet
      ? {
          left: tabletTabBarLeft,
          width: tabletTabBarWidth,
          marginHorizontal: 0,
        }
      : {
          left: 0,
          right: 0,
          marginHorizontal: FLOAT_TAB_HORIZONTAL_INSET,
        }),
    bottom: FLOAT_TAB_BOTTOM_GAP + p.insets.bottom,
    height: tabBarHeight,
    paddingTop: FLOAT_TAB_INNER_PAD_VERTICAL,
    paddingBottom: FLOAT_TAB_INNER_PAD_VERTICAL,
    backgroundColor: p.tabBackgroundColor,
    borderTopWidth: 0,
    borderWidth: 0,
    borderRadius: tabBarHeight / 2,
    ...Platform.select({
      ios: {
        shadowColor: p.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: p.shadowOpacity,
        shadowRadius: 20,
      },
      android: {
        elevation: 14,
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
