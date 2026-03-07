import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { getColors } from '@/shared/config';
import { ScreenHeader } from '@/shared/ui';

const PRIVACY_POLICY_URL = 'https://nova-lms-portal.vercel.app/docs/privacy-policy';

export const PrivacyPolicyScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: color.background.primary }}>
      <ScreenHeader
        title="Политика конфиденциальности"
        color={color}
        onBack={() => navigation.goBack()}
      />
      <WebView
        source={{ uri: PRIVACY_POLICY_URL }}
        style={{ flex: 1 }}
        renderLoading={() => (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={color.accent.primary} />
          </View>
        )}
        startInLoadingState
      />
    </View>
  );
};
