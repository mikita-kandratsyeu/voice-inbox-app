import { StackActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

import type { SettingsStackParamList } from './types';

/** Back from a settings sub-screen; falls back to Settings when the stack has no history (e.g. tablet sidebar deep link). */
export function useSettingsStackBack(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const hasSettingsRoot = navigation.getState().routes.some((route) => route.name === 'Settings');
    if (hasSettingsRoot) {
      navigation.dispatch(StackActions.popToTop());
      return;
    }
    navigation.navigate('Settings');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  return handleBack;
}
