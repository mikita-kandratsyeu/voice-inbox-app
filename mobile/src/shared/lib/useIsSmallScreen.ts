import { useWindowDimensions } from 'react-native';

import { IS_IOS } from './platform';

export const useIsSmallScreen = () => {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = IS_IOS ? Math.min(width, height) <= 375 : Math.min(width, height) <= 360;

  return {
    isSmallScreen,
    screenWidth: width,
    screenHeight: height,
    isSE3: IS_IOS && width === 375 && height === 667,
    isPlus: width >= 414,
  };
};
