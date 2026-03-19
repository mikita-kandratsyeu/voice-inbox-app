import { useEffect } from 'react';
import { UIManager } from 'react-native';

import { IS_ANDROID } from '@/shared/lib';

export function useAndroidLayoutAnimation(): void {
  useEffect(() => {
    if (IS_ANDROID && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
}
