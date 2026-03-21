import { useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;
const TABLET_PORTRAIT_MAX_WIDTH = 720;
const TABLET_LANDSCAPE_MAX_CAP = 1080;
const TABLET_LANDSCAPE_HORIZONTAL_INSET = 48 * 2;

export function useTabletContentMaxWidth(): number | undefined {
  const { width, height } = useWindowDimensions();

  if (width < TABLET_MIN_WIDTH) {
    return undefined;
  }

  const isLandscape = width >= height;

  if (!isLandscape) {
    return TABLET_PORTRAIT_MAX_WIDTH;
  }

  return Math.min(TABLET_LANDSCAPE_MAX_CAP, Math.floor(width - TABLET_LANDSCAPE_HORIZONTAL_INSET));
}
