import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { RootStackParamList } from './types';

/** Back from a root-stack screen; falls back to Main when the stack has no history. */
export function useRootStackBack(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main');
  }, [navigation]);
}
