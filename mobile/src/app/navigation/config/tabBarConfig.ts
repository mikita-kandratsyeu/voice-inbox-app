import { Inbox, Settings } from 'lucide-react-native';

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
