import { useWindowDimensions } from 'react-native';

import { TABLET_SIDEBAR_WIDTH } from '@/app/navigation/tablet/tabletSidebarMetrics';

import { useTabletShellLayout } from './useTabletShellLayout';

const TABLET_MIN_WIDTH = 768;
/** Readable column for settings, onboarding, pickers (matches portrait cap). */
const TABLET_FORM_MAX_WIDTH = 720;
/** Wider lists on full-screen routes (no tablet shell). */
const TABLET_WIDE_MAX_WIDTH = 1080;
const TABLET_FORM_HORIZONTAL_INSET = 32;
const TABLET_WIDE_HORIZONTAL_INSET = 48 * 2;

export type TabletContentMaxWidthVariant = 'form' | 'wide';

export function useTabletContentMaxWidth(
  variant: TabletContentMaxWidthVariant = 'form',
): number | undefined {
  const { width } = useWindowDimensions();
  const inTabletShell = useTabletShellLayout();

  if (width < TABLET_MIN_WIDTH) {
    return undefined;
  }

  const layoutWidth = inTabletShell ? width - TABLET_SIDEBAR_WIDTH : width;

  if (inTabletShell) {
    return layoutWidth;
  }

  if (variant === 'wide') {
    return Math.min(TABLET_WIDE_MAX_WIDTH, Math.floor(layoutWidth - TABLET_WIDE_HORIZONTAL_INSET));
  }

  return Math.min(TABLET_FORM_MAX_WIDTH, Math.floor(layoutWidth - TABLET_FORM_HORIZONTAL_INSET));
}
