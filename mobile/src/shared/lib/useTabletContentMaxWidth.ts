import { useWindowDimensions } from 'react-native';

import { useTabletShellLayout } from './useTabletShellLayout';

const TABLET_MIN_WIDTH = 768;
/** Readable column for settings, onboarding, pickers (matches portrait cap). */
const TABLET_FORM_MAX_WIDTH = 720;
/** Wider lists: inbox, recording detail, tasks. */
const TABLET_WIDE_MAX_WIDTH = 1080;
/** Expanded sidebar width — keep in sync with `tabletSidebarMetrics`. */
const TABLET_SHELL_SIDEBAR_WIDTH = 300;
const TABLET_FORM_HORIZONTAL_INSET = 32;
const TABLET_WIDE_HORIZONTAL_INSET = 48 * 2;

export type TabletContentMaxWidthVariant = 'form' | 'wide';

export function useTabletContentMaxWidth(
  variant: TabletContentMaxWidthVariant = 'form',
): number | undefined {
  const { width, height } = useWindowDimensions();
  const inTabletShell = useTabletShellLayout();

  if (width < TABLET_MIN_WIDTH) {
    return undefined;
  }

  const layoutWidth = inTabletShell ? width - TABLET_SHELL_SIDEBAR_WIDTH : width;
  const isLandscape = width >= height;
  const maxCap = variant === 'wide' ? TABLET_WIDE_MAX_WIDTH : TABLET_FORM_MAX_WIDTH;
  const horizontalInset =
    variant === 'wide' ? TABLET_WIDE_HORIZONTAL_INSET : TABLET_FORM_HORIZONTAL_INSET;

  return Math.min(maxCap, Math.floor(layoutWidth - horizontalInset));
}
