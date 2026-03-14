import { useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;

export const useIsTablet = (): boolean => {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH;
};
